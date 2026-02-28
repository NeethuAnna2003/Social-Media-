try:
    from backend.realtime_captions.caption_generator import generate_video_captions
    print("SUCCESS: Imported from backend.realtime_captions")
except ImportError:
    try:
        from realtime_captions.caption_generator import generate_video_captions
        print("SUCCESS: Imported from realtime_captions")
    except ImportError as e:
        print(f"FAILURE: {e}")
