"""
Real-Time AI Caption Generator — Maximum Accuracy Edition
==========================================================
• Engine: OpenAI Whisper (large-v3) or Faster-Whisper (distil-large-v3)
• Auto language detection across 99 languages
• Word-level timestamps
• VAD (Voice Activity Detection) for clean segmentation
• Thread-safe Tkinter GUI with live status
• AssemblyAI toggle for cloud-based transcription

Run standalone:  python caption_generator.py
"""

import os
import time
import threading
import queue
import numpy as np
import subprocess
import json
import logging

# ── Audio capture ─────────────────────────────────────────────────────────────
try:
    import sounddevice as sd
    _SD_AVAILABLE = True
except ImportError:
    _SD_AVAILABLE = False

# ── GUI ───────────────────────────────────────────────────────────────────────
import tkinter as tk
from tkinter import scrolledtext, ttk, messagebox

# ── Faster-Whisper (preferred — faster, same accuracy) ───────────────────────
try:
    from faster_whisper import WhisperModel
    _FASTER_WHISPER = True
except ImportError:
    WhisperModel = None
    _FASTER_WHISPER = False

# ── OpenAI Whisper (fallback) ─────────────────────────────────────────────────
try:
    import whisper as openai_whisper
    _OPENAI_WHISPER = True
except ImportError:
    openai_whisper = None
    _OPENAI_WHISPER = False

# ── AssemblyAI (optional cloud engine) ───────────────────────────────────────
try:
    import assemblyai as aai
    _AAI_AVAILABLE = True
except ImportError:
    aai = None
    _AAI_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────
SAMPLE_RATE       = 16000
CHANNELS          = 1
BLOCK_SIZE        = 4096
VAD_THRESHOLD     = 0.012   # RMS energy threshold for speech detection
SILENCE_LIMIT     = 0.7     # seconds of silence before transcribing
MAX_BUFFER_SECS   = 6.0     # max buffer before forced transcription

# Model selection:
# Faster-Whisper: "distil-large-v3" (fastest, 99% accuracy) or "large-v3"
# OpenAI Whisper: "large-v3" (99% accuracy) or "medium" (faster)
FW_MODEL_SIZE  = "distil-large-v3"   # Faster-Whisper model
OW_MODEL_SIZE  = "large-v3"          # OpenAI Whisper model (fallback)


# ─────────────────────────────────────────────────────────────────────────────
# Backend video processing (used by Django views)
# ─────────────────────────────────────────────────────────────────────────────

def extract_audio(video_path: str, output_audio_path: str) -> bool:
    """Extract 16 kHz mono WAV from video using FFmpeg."""
    try:
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-vn",
            "-ac", "1",
            "-ar", "16000",
            "-acodec", "pcm_s16le",
            output_audio_path,
        ]
        subprocess.run(cmd, check=True, capture_output=True, timeout=300)
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg failed: {e.stderr.decode()[-400:]}")
        return False
    except FileNotFoundError:
        logger.error("FFmpeg not found. Install FFmpeg and add it to PATH.")
        return False
    except Exception as e:
        logger.error(f"Audio extraction error: {e}")
        return False


def generate_video_captions(video_path: str, language: str = "auto", api_key: str = None) -> dict:
    """
    Generate captions for a video file.
    Priority: AssemblyAI cloud → Faster-Whisper → OpenAI Whisper.
    Returns standardized dict for Django views.
    """
    audio_path = video_path.rsplit(".", 1)[0] + "_cap_tmp.wav"

    if not extract_audio(video_path, audio_path):
        return {"success": False, "error": "Audio extraction failed (FFmpeg error)"}

    words = []
    detected_language = language
    engine_used = "none"

    try:
        # ── 1. Try AssemblyAI ─────────────────────────────────────────────────
        aai_key = api_key or os.getenv("ASSEMBLYAI_API_KEY", "")
        if _AAI_AVAILABLE and aai_key and aai_key not in ("YOUR_API_KEY_HERE", "your_assemblyai_api_key_here", ""):
            try:
                logger.info("Attempting AssemblyAI transcription…")
                aai.settings.api_key = aai_key
                transcriber = aai.Transcriber()

                cfg_kwargs = {"language_detection": True} if language == "auto" else {"language_code": language}
                config = aai.TranscriptionConfig(
                    punctuate=True,
                    format_text=True,
                    disfluencies=False,
                    speech_model=aai.SpeechModel.best,
                    **cfg_kwargs,
                )
                transcript = transcriber.transcribe(audio_path, config)

                if transcript.status == aai.TranscriptStatus.error:
                    raise RuntimeError(transcript.error)

                for w in (transcript.words or []):
                    words.append({
                        "start_time": w.start / 1000.0,
                        "end_time":   w.end   / 1000.0,
                        "text":       w.text,
                        "confidence": getattr(w, "confidence", 0.9),
                    })

                detected_language = getattr(transcript, "language_code", language) or language
                engine_used = "assemblyai"
                logger.info(f"AssemblyAI: {len(words)} words, lang={detected_language}")

            except Exception as e:
                logger.warning(f"AssemblyAI failed ({e}), switching to local Whisper…")
                words = []

        # ── 2. Faster-Whisper ─────────────────────────────────────────────────
        if not words and _FASTER_WHISPER:
            try:
                logger.info(f"Transcribing with Faster-Whisper [{FW_MODEL_SIZE}]…")
                import torch
                device  = "cuda" if torch.cuda.is_available() else "cpu"
                compute = "float16" if device == "cuda" else "int8"
                model   = WhisperModel(FW_MODEL_SIZE, device=device, compute_type=compute)

                lang = None if language == "auto" else language
                segments, info = model.transcribe(
                    audio_path,
                    beam_size=5,
                    language=lang,
                    word_timestamps=True,
                    vad_filter=True,
                    vad_parameters={"min_silence_duration_ms": 300},
                    temperature=0.0,
                    condition_on_previous_text=True,
                )

                for seg in segments:
                    for w in (seg.words or []):
                        t = w.word.strip()
                        if t:
                            words.append({
                                "start_time": w.start,
                                "end_time":   w.end,
                                "text":       t,
                                "confidence": w.probability,
                            })

                detected_language = info.language or "en"
                engine_used = "faster_whisper"
                logger.info(f"Faster-Whisper: {len(words)} words, lang={detected_language}")

            except Exception as e:
                logger.warning(f"Faster-Whisper failed ({e}), trying OpenAI Whisper…")
                words = []

        # ── 3. OpenAI Whisper ─────────────────────────────────────────────────
        if not words and _OPENAI_WHISPER:
            logger.info(f"Transcribing with OpenAI Whisper [{OW_MODEL_SIZE}]…")
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
            model  = openai_whisper.load_model(OW_MODEL_SIZE, device=device)

            lang = None if language == "auto" else language
            result = model.transcribe(
                audio_path,
                language=lang,
                task="transcribe",
                word_timestamps=True,
                temperature=0.0,
                best_of=5,
                beam_size=5,
                condition_on_previous_text=True,
                fp16=(device == "cuda"),
                verbose=False,
            )

            for seg in result.get("segments", []):
                for w in seg.get("words", []):
                    t = w.get("word", "").strip()
                    if t:
                        words.append({
                            "start_time": w["start"],
                            "end_time":   w["end"],
                            "text":       t,
                            "confidence": float(w.get("probability", 0.9)),
                        })

            detected_language = result.get("language", "en") or "en"
            engine_used = "openai_whisper"
            logger.info(f"OpenAI Whisper: {len(words)} words, lang={detected_language}")

    finally:
        if os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except Exception:
                pass

    if not words:
        return {"success": False, "error": "All engines produced no output."}

    # Group words into caption segments
    captions = _group_words(words)

    return {
        "success":           True,
        "captions":          captions,
        "detected_language": detected_language,
        "engine":            engine_used,
    }


def _group_words(words: list) -> list:
    """Group word-level timestamps into readable caption segments."""
    segments = []
    bucket = []
    bucket_start = None

    for w in words:
        if not w.get("text", "").strip():
            continue
        if bucket_start is None:
            bucket_start = w["start_time"]
        bucket.append(w)
        duration = w["end_time"] - bucket_start
        ends_sentence = w["text"].strip()[-1:] in ".?!。？！"

        if len(bucket) >= 10 or duration >= 5.0 or ends_sentence:
            segments.append({
                "start_time": bucket_start,
                "end_time":   w["end_time"],
                "text":       " ".join(x["text"].strip() for x in bucket),
                "confidence": sum(x["confidence"] for x in bucket) / len(bucket),
            })
            bucket = []
            bucket_start = None

    if bucket:
        segments.append({
            "start_time": bucket_start,
            "end_time":   bucket[-1]["end_time"],
            "text":       " ".join(x["text"].strip() for x in bucket),
            "confidence": sum(x["confidence"] for x in bucket) / len(bucket),
        })
    return segments


# ─────────────────────────────────────────────────────────────────────────────
# Real-Time GUI Application
# ─────────────────────────────────────────────────────────────────────────────

class CaptionGenerator:
    """
    Real-time AI caption generator with Tkinter GUI.
    Uses Faster-Whisper or OpenAI Whisper for local transcription.
    Optional AssemblyAI real-time streaming.
    """

    def __init__(self):
        self.running        = False
        self.use_assemblyai = False
        self.audio_queue    = queue.Queue()
        self.ui_queue       = queue.Queue()
        self.buffer         = np.array([], dtype=np.float32)
        self.last_speech_t  = time.time()
        self.fw_model       = None
        self.ow_model       = None
        self.aai_transcriber = None
        self.detected_lang  = "auto"

        self._setup_gui()
        self._poll_ui()

    # ── GUI setup ─────────────────────────────────────────────────────────────

    def _setup_gui(self):
        self.root = tk.Tk()
        self.root.title("Real-Time AI Caption Generator — Max Accuracy")
        self.root.geometry("820x580")
        self.root.configure(bg="#0D0D0D")
        self.root.resizable(True, True)

        # ── Header ────────────────────────────────────────────────────────────
        hdr = tk.Frame(self.root, bg="#0D0D0D")
        hdr.pack(fill=tk.X, padx=20, pady=(14, 0))

        tk.Label(
            hdr, text="⚡ AI Caption Generator",
            font=("Segoe UI", 18, "bold"),
            bg="#0D0D0D", fg="#FFFFFF"
        ).pack(side=tk.LEFT)

        self.lbl_engine = tk.Label(
            hdr, text="Engine: —",
            font=("Segoe UI", 10),
            bg="#0D0D0D", fg="#888888"
        )
        self.lbl_engine.pack(side=tk.RIGHT)

        # ── Language indicator ────────────────────────────────────────────────
        lang_frame = tk.Frame(self.root, bg="#0D0D0D")
        lang_frame.pack(fill=tk.X, padx=20, pady=(4, 0))

        tk.Label(
            lang_frame, text="Detected Language:",
            font=("Segoe UI", 10), bg="#0D0D0D", fg="#888888"
        ).pack(side=tk.LEFT)

        self.lbl_lang = tk.Label(
            lang_frame, text="Auto-detecting…",
            font=("Segoe UI", 10, "bold"), bg="#0D0D0D", fg="#00D4FF"
        )
        self.lbl_lang.pack(side=tk.LEFT, padx=6)

        # ── Caption display ───────────────────────────────────────────────────
        self.text_area = scrolledtext.ScrolledText(
            self.root,
            wrap=tk.WORD,
            font=("Consolas", 17),
            bg="#000000", fg="#00FF88",
            insertbackground="white",
            relief=tk.FLAT,
            padx=12, pady=10,
        )
        self.text_area.pack(padx=20, pady=10, fill=tk.BOTH, expand=True)
        self.text_area.tag_configure("partial", foreground="#888888")
        self.text_area.tag_configure("final",   foreground="#00FF88")

        # ── Controls ──────────────────────────────────────────────────────────
        ctrl = tk.Frame(self.root, bg="#0D0D0D")
        ctrl.pack(fill=tk.X, padx=20, pady=(0, 8))

        self.btn_record = tk.Button(
            ctrl, text="▶  Start Recording",
            command=self._toggle_capture,
            font=("Segoe UI", 12, "bold"),
            bg="#00C853", fg="white",
            relief=tk.FLAT, padx=16, pady=8,
            cursor="hand2",
        )
        self.btn_record.pack(side=tk.LEFT)

        self.btn_clear = tk.Button(
            ctrl, text="🗑  Clear",
            command=lambda: self.text_area.delete("1.0", tk.END),
            font=("Segoe UI", 11),
            bg="#333333", fg="white",
            relief=tk.FLAT, padx=12, pady=8,
            cursor="hand2",
        )
        self.btn_clear.pack(side=tk.LEFT, padx=8)

        self.btn_mode = tk.Button(
            ctrl, text="☁  Switch to AssemblyAI",
            command=self._toggle_mode,
            font=("Segoe UI", 11),
            bg="#1565C0", fg="white",
            relief=tk.FLAT, padx=12, pady=8,
            cursor="hand2",
        )
        self.btn_mode.pack(side=tk.RIGHT)

        # ── Status bar ────────────────────────────────────────────────────────
        self.lbl_status = tk.Label(
            self.root,
            text="Status: Ready  |  Model: " + (FW_MODEL_SIZE if _FASTER_WHISPER else OW_MODEL_SIZE),
            font=("Segoe UI", 9),
            bg="#0D0D0D", fg="#666666",
            anchor=tk.W,
        )
        self.lbl_status.pack(fill=tk.X, padx=20, pady=(0, 8))

    # ── UI queue polling ──────────────────────────────────────────────────────

    def _poll_ui(self):
        try:
            while not self.ui_queue.empty():
                kind, data = self.ui_queue.get_nowait()
                if kind == "caption":
                    self.text_area.insert(tk.END, data + "\n", "final")
                    self.text_area.see(tk.END)
                elif kind == "partial":
                    # Replace last partial line
                    self.text_area.delete("end-2l", "end-1l")
                    self.text_area.insert(tk.END, data + "\n", "partial")
                    self.text_area.see(tk.END)
                elif kind == "status":
                    self.lbl_status.config(text=f"Status: {data}")
                elif kind == "lang":
                    self.lbl_lang.config(text=data)
                elif kind == "engine":
                    self.lbl_engine.config(text=f"Engine: {data}")
                elif kind == "btn_record":
                    text, color = data
                    self.btn_record.config(text=text, bg=color)
        except queue.Empty:
            pass
        finally:
            self.root.after(80, self._poll_ui)

    def _log(self, msg: str):
        self.ui_queue.put(("status", msg))

    # ── Model loading ─────────────────────────────────────────────────────────

    def _load_local_model(self):
        if _FASTER_WHISPER and self.fw_model is None:
            self._log(f"Loading Faster-Whisper [{FW_MODEL_SIZE}]… (first run may take 1-2 min)")
            try:
                import torch
                device  = "cuda" if torch.cuda.is_available() else "cpu"
                compute = "float16" if device == "cuda" else "int8"
                self.fw_model = WhisperModel(FW_MODEL_SIZE, device=device, compute_type=compute)
                self.ui_queue.put(("engine", f"Faster-Whisper [{FW_MODEL_SIZE}] on {device}"))
                self._log(f"Faster-Whisper ready on {device}.")
            except Exception as e:
                self._log(f"Faster-Whisper load failed: {e}")

        elif _OPENAI_WHISPER and self.ow_model is None:
            self._log(f"Loading OpenAI Whisper [{OW_MODEL_SIZE}]… (first run may take 2-3 min)")
            try:
                import torch
                device = "cuda" if torch.cuda.is_available() else "cpu"
                self.ow_model = openai_whisper.load_model(OW_MODEL_SIZE, device=device)
                self.ui_queue.put(("engine", f"OpenAI Whisper [{OW_MODEL_SIZE}] on {device}"))
                self._log(f"OpenAI Whisper ready on {device}.")
            except Exception as e:
                self._log(f"OpenAI Whisper load failed: {e}")

    def _load_assemblyai(self) -> bool:
        if not _AAI_AVAILABLE:
            messagebox.showerror("AssemblyAI", "assemblyai package not installed.\nRun: pip install assemblyai")
            return False

        api_key = os.getenv("ASSEMBLYAI_API_KEY", "")
        if not api_key or api_key in ("YOUR_API_KEY_HERE", "your_assemblyai_api_key_here"):
            messagebox.showerror(
                "AssemblyAI",
                "ASSEMBLYAI_API_KEY not set.\n"
                "Add it to your .env file:\nASSEMBLYAI_API_KEY=your_key_here"
            )
            return False

        aai.settings.api_key = api_key
        self.aai_transcriber = aai.RealtimeTranscriber(
            on_data=self._on_aai_data,
            on_error=self._on_aai_error,
            sample_rate=SAMPLE_RATE,
        )
        self.ui_queue.put(("engine", "AssemblyAI Real-Time"))
        return True

    # ── AssemblyAI callbacks ──────────────────────────────────────────────────

    def _on_aai_data(self, transcript: "aai.RealtimeTranscript"):
        if not transcript.text:
            return
        if isinstance(transcript, aai.RealtimeFinalTranscript):
            self.ui_queue.put(("caption", transcript.text))
        else:
            self.ui_queue.put(("partial", transcript.text))

    def _on_aai_error(self, error: "aai.RealtimeError"):
        self._log(f"AssemblyAI error: {error}")

    # ── Audio callback ────────────────────────────────────────────────────────

    def _audio_callback(self, indata, frames, t, status):
        if status:
            logger.warning(f"Audio status: {status}")
        chunk = indata.copy()
        self.audio_queue.put(chunk)

        if self.use_assemblyai and self.aai_transcriber:
            pcm = (chunk * 32767).astype(np.int16).tobytes()
            self.aai_transcriber.stream(pcm)

    # ── Processing thread ─────────────────────────────────────────────────────

    def _process_loop(self):
        while self.running:
            try:
                if self.use_assemblyai:
                    time.sleep(0.05)
                    continue

                frames = []
                while not self.audio_queue.empty():
                    frames.append(self.audio_queue.get())

                if not frames:
                    time.sleep(0.04)
                    continue

                chunk = np.concatenate(frames).flatten()
                self.buffer = np.concatenate((self.buffer, chunk))

                # VAD
                energy = float(np.sqrt(np.mean(chunk ** 2)))
                if energy > VAD_THRESHOLD:
                    self.last_speech_t = time.time()

                duration       = len(self.buffer) / SAMPLE_RATE
                silence_secs   = time.time() - self.last_speech_t

                if (duration > 0.8 and silence_secs > SILENCE_LIMIT) or duration > MAX_BUFFER_SECS:
                    self._transcribe_buffer()

            except Exception as e:
                logger.error(f"Process loop error: {e}")

    def _transcribe_buffer(self):
        if len(self.buffer) < SAMPLE_RATE * 0.3:  # skip very short clips
            self.buffer = np.array([], dtype=np.float32)
            return

        buf = self.buffer.copy()
        self.buffer = np.array([], dtype=np.float32)

        try:
            if _FASTER_WHISPER and self.fw_model:
                segments, info = self.fw_model.transcribe(
                    buf,
                    beam_size=5,
                    word_timestamps=False,
                    vad_filter=True,
                    temperature=0.0,
                )
                text = " ".join(s.text.strip() for s in segments).strip()
                lang = info.language or self.detected_lang

            elif _OPENAI_WHISPER and self.ow_model:
                result = self.ow_model.transcribe(
                    buf,
                    task="transcribe",
                    temperature=0.0,
                    fp16=False,
                    verbose=False,
                )
                text = result.get("text", "").strip()
                lang = result.get("language", self.detected_lang)

            else:
                return

            if text:
                self.ui_queue.put(("caption", text))
                if lang and lang != self.detected_lang:
                    self.detected_lang = lang
                    self.ui_queue.put(("lang", f"{lang.upper()} (auto-detected)"))

        except Exception as e:
            logger.error(f"Transcription error: {e}")

    # ── Controls ──────────────────────────────────────────────────────────────

    def _toggle_capture(self):
        if not self.running:
            if not _SD_AVAILABLE:
                messagebox.showerror("Error", "sounddevice not installed.\nRun: pip install sounddevice")
                return

            try:
                if self.use_assemblyai:
                    if not self._load_assemblyai():
                        return
                    self.aai_transcriber.connect()
                else:
                    threading.Thread(target=self._load_local_model, daemon=True).start()

                self.stream = sd.InputStream(
                    callback=self._audio_callback,
                    channels=CHANNELS,
                    samplerate=SAMPLE_RATE,
                    blocksize=BLOCK_SIZE,
                )
                self.stream.start()
                self.running = True

                threading.Thread(target=self._process_loop, daemon=True).start()

                self.ui_queue.put(("btn_record", ("⏹  Stop Recording", "#D32F2F")))
                self._log("Listening… speak now.")

            except Exception as e:
                self._log(f"Error starting stream: {e}")
        else:
            self.running = False
            try:
                self.stream.stop()
                self.stream.close()
            except Exception:
                pass

            if self.use_assemblyai and self.aai_transcriber:
                try:
                    self.aai_transcriber.close()
                except Exception:
                    pass

            self.ui_queue.put(("btn_record", ("▶  Start Recording", "#00C853")))
            self._log("Stopped.")

    def _toggle_mode(self):
        if self.running:
            self._log("Stop recording first before switching modes.")
            return

        self.use_assemblyai = not self.use_assemblyai
        if self.use_assemblyai:
            self.btn_mode.config(text="🖥  Switch to Local Whisper", bg="#6A1B9A")
            self._log("Mode: AssemblyAI Real-Time (cloud)")
        else:
            self.btn_mode.config(text="☁  Switch to AssemblyAI", bg="#1565C0")
            model_name = FW_MODEL_SIZE if _FASTER_WHISPER else OW_MODEL_SIZE
            self._log(f"Mode: Local Whisper [{model_name}]")

    def run(self):
        self.root.mainloop()


# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app = CaptionGenerator()
    app.run()
