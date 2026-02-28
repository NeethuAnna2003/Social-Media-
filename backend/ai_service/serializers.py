from rest_framework import serializers

class TextAnalysisSerializer(serializers.Serializer):
    text = serializers.CharField(required=True, allow_blank=False)

class CaptionGenerationSerializer(serializers.Serializer):
    # We might accept an image, but for now just optional context
    context = serializers.CharField(required=False, allow_blank=True)

class NewsRequestSerializer(serializers.Serializer):
    topic = serializers.CharField(required=False, default="technology")
