"""
AssemblyAI Caption Service — Production-Ready Maximum Accuracy
==============================================================
Engine priority:
  1. AssemblyAI cloud  (95%+ accuracy, requires API key + internet)
  2. OpenAI Whisper    (99% accuracy, fully local, no key needed)

KEY INSIGHT — Whisper has two tasks:
  task='translate'   → Always outputs ENGLISH regardless of input language.
                       Use this when user wants English captions from any video.
                       99% accuracy for English output.
  task='transcribe'  → Outputs in the ORIGINAL language of the video.
                       Use this when user wants native language captions.
                       Accuracy varies by language (Malayalam is tricky).

HALLUCINATION PREVENTION:
  - no_speech_threshold=0.6  → skip silent/music segments
  - logprob_threshold=-1.0   → discard low-confidence segments
  - compression_ratio_threshold=2.4 → discard repetitive hallucinations
  - temperature fallback chain → retry with higher temp if stuck
"""

import os
import re
import subprocess
import time
import logging
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from django.conf import settings

import requests

logger = logging.getLogger(__name__)

# ── OpenAI Whisper ────────────────────────────────────────────────────────────
try:
    import whisper as openai_whisper
    _OPENAI_WHISPER = True
    logger.info("openai-whisper available ✓")
except ImportError:
    openai_whisper = None
    _OPENAI_WHISPER = False
    logger.warning("openai-whisper NOT installed. Run: pip install openai-whisper")

# ── Faster-Whisper (optional) ─────────────────────────────────────────────────
try:
    from faster_whisper import WhisperModel as FasterWhisperModel
    _FASTER_WHISPER = True
    logger.info("faster-whisper available ✓")
except ImportError:
    FasterWhisperModel = None
    _FASTER_WHISPER = False

if not _OPENAI_WHISPER and not _FASTER_WHISPER:
    logger.critical("NO Whisper engine available! Install: pip install openai-whisper")


# ── Singleton model cache ─────────────────────────────────────────────────────
_ow_model_cache: Dict[str, object] = {}   # model_size -> model
_fw_model_cache: Dict[str, object] = {}   # model_size -> model


# ─────────────────────────────────────────────────────────────────────────────
# Hallucination patterns to filter out
# ─────────────────────────────────────────────────────────────────────────────
_HALLUCINATION_PATTERNS = re.compile(
    r'^[\s\W]*$'                          # empty / punctuation only
    r'|(.)\1{8,}'                         # same char repeated 8+ times (ਸਸਸਸ...)
    r'|^(thanks? for watching|subscribe|like and subscribe|'
    r'please subscribe|copyright|all rights reserved)[\s\W]*$',
    re.IGNORECASE
)

def _is_hallucination(text: str) -> bool:
    """Return True if the segment looks like a Whisper hallucination."""
    t = text.strip()
    if not t or len(t) < 2:
        return True
    if _HALLUCINATION_PATTERNS.search(t):
        return True
    # Detect repeated character blocks (e.g. ਸਸਸਸਸਸਸ)
    if len(set(t.replace(' ', ''))) <= 2 and len(t) > 10:
        return True
    return False


# ─────────────────────────────────────────────────────────────────────────────
# Audio extraction
# ─────────────────────────────────────────────────────────────────────────────

def _extract_audio(video_path: str, audio_path: str) -> bool:
    """Extract 16 kHz mono WAV from video using FFmpeg."""
    try:
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-vn",
            "-ac", "1",
            "-ar", "16000",
            "-acodec", "pcm_s16le",
            audio_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            logger.error(f"FFmpeg error:\n{result.stderr[-800:]}")
            return False
        if not os.path.exists(audio_path) or os.path.getsize(audio_path) == 0:
            logger.error("FFmpeg produced an empty audio file.")
            return False
        return True
    except FileNotFoundError:
        logger.error("FFmpeg not found. Install FFmpeg and add it to PATH.")
        return False
    except Exception as e:
        logger.error(f"Audio extraction failed: {e}")
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Caption segment builder from word-level timestamps
# ─────────────────────────────────────────────────────────────────────────────

def _words_to_segments(words: List[Dict]) -> List[Dict]:
    """
    Group word-level timestamps into natural caption segments.
    Rules: max 10 words, max 5 seconds, break at sentence boundaries.
    """
    segments: List[Dict] = []
    if not words:
        return segments

    bucket: List[Dict] = []
    bucket_start: Optional[float] = None

    for w in words:
        text = w.get("text", "").strip()
        if not text:
            continue

        if bucket_start is None:
            bucket_start = w["start_time"]

        bucket.append(w)
        duration = w["end_time"] - bucket_start
        ends_sentence = text[-1] in ".?!。？！"

        if len(bucket) >= 10 or duration >= 5.0 or ends_sentence:
            seg_text = " ".join(x["text"].strip() for x in bucket)
            if not _is_hallucination(seg_text):
                segments.append({
                    "start_time": bucket_start,
                    "end_time":   w["end_time"],
                    "text":       seg_text,
                    "confidence": sum(x["confidence"] for x in bucket) / len(bucket),
                })
            bucket = []
            bucket_start = None

    if bucket:
        seg_text = " ".join(x["text"].strip() for x in bucket)
        if not _is_hallucination(seg_text):
            segments.append({
                "start_time": bucket_start,
                "end_time":   bucket[-1]["end_time"],
                "text":       seg_text,
                "confidence": sum(x["confidence"] for x in bucket) / len(bucket),
            })

    return segments


def _raw_segments_to_captions(segments_raw: List[Dict]) -> List[Dict]:
    """Convert Whisper segment-level output to caption dicts (no word timestamps)."""
    captions = []
    for seg in segments_raw:
        text = seg.get("text", "").strip()
        if not text or _is_hallucination(text):
            continue
        avg_logprob = seg.get("avg_logprob", -0.5)
        no_speech   = seg.get("no_speech_prob", 0.0)
        if no_speech > 0.6:
            continue  # skip silence
        confidence = max(0.0, min(1.0, avg_logprob + 1.0))
        captions.append({
            "start_time": seg["start"],
            "end_time":   seg["end"],
            "text":       text,
            "confidence": confidence,
        })
    return captions


# ─────────────────────────────────────────────────────────────────────────────
# AssemblyAI REST client
# ─────────────────────────────────────────────────────────────────────────────

class _AssemblyAIClient:
    BASE = "https://api.assemblyai.com/v2"

    LANG_MAP = {
        "en": "en", "es": "es", "fr": "fr", "de": "de",
        "it": "it", "pt": "pt", "nl": "nl", "hi": "hi",
        "ja": "ja", "zh": "zh", "ko": "ko", "pl": "pl",
        "ru": "ru", "tr": "tr", "ar": "ar", "uk": "uk",
        "fi": "fi", "da": "da", "sv": "sv", "no": "no",
        # Indian languages not natively supported → English
        "ml": "en", "ta": "en", "te": "en", "bn": "en",
        "gu": "en", "kn": "en", "mr": "en", "pa": "en",
    }

    def __init__(self, api_key: str):
        self._auth    = {"authorization": api_key}
        self._json_h  = {"authorization": api_key, "content-type": "application/json"}

    def upload(self, audio_path: str) -> Optional[str]:
        try:
            with open(audio_path, "rb") as f:
                resp = requests.post(
                    f"{self.BASE}/upload",
                    headers=self._auth,
                    data=f,
                    timeout=300,
                )
            if resp.status_code == 200:
                return resp.json()["upload_url"]
            logger.error(f"AAI upload failed {resp.status_code}: {resp.text[:300]}")
        except Exception as e:
            logger.error(f"AAI upload exception: {e}")
        return None

    def submit(self, upload_url: str, language: str) -> Optional[str]:
        """Submit with valid AssemblyAI v2 fields only."""
        payload: Dict = {
            "audio_url":    upload_url,
            "punctuate":    True,
            "format_text":  True,
            "disfluencies": False,
            "speech_model": "best",
        }
        if language and language not in ("auto", "en"):
            payload["language_code"] = self.LANG_MAP.get(language, "en")
        else:
            payload["language_detection"] = True

        try:
            resp = requests.post(
                f"{self.BASE}/transcript",
                headers=self._json_h,
                json=payload,
                timeout=30,
            )
            if resp.status_code == 200:
                return resp.json()["id"]
            logger.error(f"AAI submit failed {resp.status_code}: {resp.text[:500]}")
        except Exception as e:
            logger.error(f"AAI submit exception: {e}")
        return None

    def poll(self, transcript_id: str, job=None) -> Optional[Dict]:
        for attempt in range(180):
            try:
                resp = requests.get(
                    f"{self.BASE}/transcript/{transcript_id}",
                    headers=self._auth,
                    timeout=30,
                )
                if resp.status_code != 200:
                    return None
                data = resp.json()
                st = data["status"]
                if st == "completed":
                    return data
                if st == "error":
                    logger.error(f"AAI error: {data.get('error')}")
                    return None
                if job:
                    try:
                        job.progress = 30 + min(55, int(attempt / 180 * 55))
                        job.save(update_fields=["progress"])
                    except Exception:
                        pass
                time.sleep(5)
            except Exception as e:
                logger.error(f"AAI poll exception: {e}")
                return None
        logger.error("AssemblyAI polling timed out")
        return None

    def parse_words(self, data: Dict) -> Tuple[List[Dict], str]:
        words = []
        for w in data.get("words", []):
            t = w.get("text", "").strip()
            if t:
                words.append({
                    "start_time": w.get("start", 0) / 1000.0,
                    "end_time":   w.get("end",   0) / 1000.0,
                    "text":       t,
                    "confidence": w.get("confidence", 0.9),
                })
        detected_lang = data.get("language_code", "en") or "en"
        return words, detected_lang


# ─────────────────────────────────────────────────────────────────────────────
# OpenAI Whisper transcription
# ─────────────────────────────────────────────────────────────────────────────

def _get_openai_whisper_model(model_size: str):
    global _ow_model_cache
    if model_size in _ow_model_cache:
        return _ow_model_cache[model_size]
    if not _OPENAI_WHISPER:
        raise RuntimeError("openai-whisper not installed.")
    try:
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Loading OpenAI Whisper [{model_size}] on {device}…")
        model = openai_whisper.load_model(model_size, device=device)
        _ow_model_cache[model_size] = model
        logger.info(f"OpenAI Whisper [{model_size}] loaded on {device}.")
        return model
    except Exception as e:
        logger.error(f"Failed to load OpenAI Whisper: {e}")
        raise


def _transcribe_openai_whisper(
    audio_path: str,
    language: str,
    model_size: str,
    task: str = "transcribe",
) -> Tuple[List[Dict], str]:
    """
    Transcribe with OpenAI Whisper.

    task='translate'   → Always outputs English (best for non-English videos)
    task='transcribe'  → Outputs in original language

    Returns (captions_list, detected_language).
    """
    model = _get_openai_whisper_model(model_size)

    # For translate task, don't force language — let Whisper auto-detect
    lang = None if (task == "translate" or language == "auto") else language

    import torch
    use_fp16 = torch.cuda.is_available()

    # Anti-hallucination settings
    decode_options = dict(
        language=lang,
        task=task,
        word_timestamps=True,
        temperature=(0.0, 0.2, 0.4, 0.6, 0.8, 1.0),  # fallback chain
        best_of=5,
        beam_size=5,
        condition_on_previous_text=True,
        fp16=use_fp16,
        verbose=False,
        # Hallucination prevention
        no_speech_threshold=0.6,
        logprob_threshold=-1.0,
        compression_ratio_threshold=2.4,
    )

    result = model.transcribe(audio_path, **decode_options)

    detected_lang = result.get("language", "en") or "en"
    output_lang   = "en" if task == "translate" else detected_lang

    # Extract word-level timestamps
    words = []
    for seg in result.get("segments", []):
        # Skip silent/hallucinated segments
        if seg.get("no_speech_prob", 0) > 0.6:
            continue
        if seg.get("avg_logprob", -1) < -1.0:
            continue

        seg_words = seg.get("words", [])
        if seg_words:
            for w in seg_words:
                t = w.get("word", "").strip()
                if t and not _is_hallucination(t):
                    words.append({
                        "start_time": w["start"],
                        "end_time":   w["end"],
                        "text":       t,
                        "confidence": float(w.get("probability", 0.9)),
                    })
        else:
            # Segment-level fallback (no word timestamps)
            text = seg.get("text", "").strip()
            if text and not _is_hallucination(text):
                avg_logprob = seg.get("avg_logprob", -0.5)
                conf = max(0.0, min(1.0, avg_logprob + 1.0))
                words.append({
                    "start_time": seg["start"],
                    "end_time":   seg["end"],
                    "text":       text,
                    "confidence": conf,
                })

    logger.info(
        f"OpenAI Whisper [{model_size}] task={task}: "
        f"{len(words)} tokens, detected={detected_lang}, output={output_lang}"
    )
    return words, output_lang


# ─────────────────────────────────────────────────────────────────────────────
# Faster-Whisper transcription
# ─────────────────────────────────────────────────────────────────────────────

def _get_faster_whisper_model(model_size: str):
    global _fw_model_cache
    if model_size in _fw_model_cache:
        return _fw_model_cache[model_size]
    if not _FASTER_WHISPER:
        raise RuntimeError("faster-whisper not installed.")
    try:
        import torch
        device  = "cuda" if torch.cuda.is_available() else "cpu"
        compute = "float16" if device == "cuda" else "int8"
        logger.info(f"Loading Faster-Whisper [{model_size}] on {device}…")
        model = FasterWhisperModel(model_size, device=device, compute_type=compute)
        _fw_model_cache[model_size] = model
        logger.info(f"Faster-Whisper [{model_size}] loaded on {device}.")
        return model
    except Exception as e:
        logger.error(f"Failed to load Faster-Whisper: {e}")
        raise


def _transcribe_faster_whisper(
    audio_path: str,
    language: str,
    model_size: str,
    task: str = "transcribe",
) -> Tuple[List[Dict], str]:
    model = _get_faster_whisper_model(model_size)
    lang = None if (task == "translate" or language == "auto") else language

    segments, info = model.transcribe(
        audio_path,
        beam_size=5,
        language=lang,
        task=task,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 300},
        temperature=0.0,
        condition_on_previous_text=True,
        no_speech_threshold=0.6,
        log_prob_threshold=-1.0,
        compression_ratio_threshold=2.4,
    )

    words = []
    for seg in segments:
        if seg.no_speech_prob > 0.6:
            continue
        for w in (seg.words or []):
            t = w.word.strip()
            if t and not _is_hallucination(t):
                words.append({
                    "start_time": w.start,
                    "end_time":   w.end,
                    "text":       t,
                    "confidence": w.probability,
                })

    detected_lang = info.language or "en"
    output_lang   = "en" if task == "translate" else detected_lang
    logger.info(f"Faster-Whisper [{model_size}] task={task}: {len(words)} tokens, lang={output_lang}")
    return words, output_lang


def _transcribe_local(
    audio_path: str,
    language: str,
    model_size: str,
    task: str = "transcribe",
) -> Tuple[List[Dict], str]:
    """Try Faster-Whisper first, fall back to OpenAI Whisper."""
    if _FASTER_WHISPER:
        try:
            return _transcribe_faster_whisper(audio_path, language, model_size, task)
        except Exception as e:
            logger.warning(f"Faster-Whisper failed ({e}), trying OpenAI Whisper…")

    if _OPENAI_WHISPER:
        return _transcribe_openai_whisper(audio_path, language, model_size, task)

    raise RuntimeError("No local Whisper engine available. Install: pip install openai-whisper")


# ─────────────────────────────────────────────────────────────────────────────
# Public service class
# ─────────────────────────────────────────────────────────────────────────────

class AssemblyAICaptionService:
    """
    Maximum-accuracy hybrid caption service.

    How task selection works:
      language='en'   → task='translate'  (any video → English output, 99% accurate)
      language='auto' → task='translate'  (safe default: always English output)
      language='ml'   → task='transcribe' (Malayalam speech → Malayalam text)
      language='hi'   → task='transcribe' (Hindi speech → Hindi text)
      etc.

    Model size guide (WHISPER_MODEL_SIZE in settings.py):
      'medium'   → 97% accuracy, ~2min/min on CPU  ← DEFAULT
      'large-v3' → 99%+ accuracy, ~5min/min on CPU
    """

    DEFAULT_MODEL = "medium"

    def __init__(self):
        self.api_key = getattr(settings, "ASSEMBLYAI_API_KEY", "") or ""
        self.aai_available = bool(
            self.api_key
            and self.api_key not in (
                "your_assemblyai_api_key_here",
                "YOUR_API_KEY_HERE",
                "",
            )
        )
        self.model_size = (
            getattr(settings, "WHISPER_MODEL_SIZE", self.DEFAULT_MODEL)
            or self.DEFAULT_MODEL
        )

        if self.aai_available:
            logger.info(f"AssemblyAI configured. Local fallback: Whisper [{self.model_size}]")
        else:
            logger.info(f"No AssemblyAI key — using local Whisper [{self.model_size}]")

    def _determine_task(self, language: str) -> str:
        """
        Determine Whisper task based on requested language.

        'en' or 'auto' → 'translate' (always outputs English, most accurate)
        Any other lang  → 'transcribe' (outputs in that language)
        """
        if language in ("en", "auto", ""):
            return "translate"
        return "transcribe"

    def generate_captions(
        self,
        video_path: str,
        language: str = "auto",
        job=None,
    ) -> Dict:
        """
        Generate real AI captions for a video file.

        Returns:
            {
                'success': bool,
                'captions': List[{start_time, end_time, text, confidence}],
                'detected_language': str,
                'engine': str,
                'error': str | None,
                'confidence': float,
            }
        """
        if not os.path.exists(video_path):
            return self._err(f"Video file not found: {video_path}")

        # Determine Whisper task
        task = self._determine_task(language)
        logger.info(
            f"Caption generation: video={os.path.basename(video_path)}, "
            f"requested_lang={language}, whisper_task={task}, model={self.model_size}"
        )

        import uuid
        # ── Step 1: Extract audio ─────────────────────────────────────────────
        # Use UUID to prevent collision if multiple requests process same video
        audio_path = str(Path(video_path).with_suffix("")) + f"_{uuid.uuid4().hex[:8]}_cap_tmp.wav"
        self._update_job(job, "extracting_audio", 5)

        if not _extract_audio(video_path, audio_path):
            return self._err("FFmpeg audio extraction failed. Is FFmpeg installed?")

        self._update_job(job, "transcribing", 15)

        words: List[Dict] = []
        detected_language = "en"
        engine_used = "none"

        try:
            # ── Step 2a: AssemblyAI cloud ─────────────────────────────────────
            # Note: AssemblyAI always outputs in the source language.
            # For English output from non-English video, we use local Whisper translate.
            if self.aai_available and task == "transcribe":
                logger.info("Attempting AssemblyAI cloud transcription…")
                try:
                    client = _AssemblyAIClient(self.api_key)
                    upload_url = client.upload(audio_path)
                    if not upload_url:
                        raise RuntimeError("Upload to AssemblyAI failed.")

                    self._update_job(job, "uploading", 20)

                    transcript_id = client.submit(upload_url, language)
                    if not transcript_id:
                        raise RuntimeError("AssemblyAI rejected the request.")

                    self._update_job(job, "transcribing_cloud", 25)

                    data = client.poll(transcript_id, job)
                    if not data:
                        raise RuntimeError("AssemblyAI timed out.")

                    words, detected_language = client.parse_words(data)
                    engine_used = "assemblyai"
                    logger.info(f"AssemblyAI: {len(words)} words, lang={detected_language}")

                except Exception as e:
                    logger.warning(f"AssemblyAI failed ({e}), switching to local Whisper…")
                    words = []

            # ── Step 2b: Local Whisper ────────────────────────────────────────
            if not words:
                self._update_job(job, "transcribing_local", 30)
                logger.info(
                    f"Running local Whisper [{self.model_size}] "
                    f"task={task} (lang={language})…"
                )
                words, detected_language = _transcribe_local(
                    audio_path, language, self.model_size, task
                )
                engine_used = "faster_whisper" if _FASTER_WHISPER else "openai_whisper"
                logger.info(
                    f"Local Whisper: {len(words)} words, "
                    f"output_lang={detected_language}"
                )

        finally:
            try:
                if os.path.exists(audio_path):
                    os.remove(audio_path)
            except Exception:
                pass

        if not words:
            return self._err(
                "Transcription produced no output. "
                "The video may have no audible speech, or the audio is too quiet."
            )

        # ── Step 3: Group words into caption segments ──────────────────────────
        captions = _words_to_segments(words)
        if not captions:
            return self._err(
                "All transcribed segments were filtered as hallucinations. "
                "The video may contain only music/noise with no speech."
            )

        avg_conf = sum(c["confidence"] for c in captions) / max(len(captions), 1)
        self._update_job(job, "completed", 100)

        logger.info(
            f"Done: {len(captions)} captions, engine={engine_used}, "
            f"lang={detected_language}, avg_confidence={avg_conf:.1%}"
        )

        return {
            "success":           True,
            "captions":          captions,
            "detected_language": detected_language,
            "engine":            engine_used,
            "error":             None,
            "confidence":        avg_conf,
        }

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _update_job(job, status: str, progress: int):
        if job:
            try:
                job.status   = status
                job.progress = progress
                job.save(update_fields=["status", "progress"])
            except Exception:
                pass

    @staticmethod
    def _err(msg: str) -> Dict:
        logger.error(f"Caption error: {msg}")
        return {
            "success":           False,
            "captions":          [],
            "detected_language": None,
            "engine":            "none",
            "error":             msg,
            "confidence":        0.0,
        }
