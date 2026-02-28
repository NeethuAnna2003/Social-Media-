from rest_framework import serializers
from .models import Hashtag, TrendingHashtag

class HashtagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hashtag
        fields = ['name', 'usage_count', 'last_used']

class TrendingHashtagSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='hashtag.name')
    usage_count = serializers.IntegerField(source='hashtag.usage_count')

    class Meta:
        model = TrendingHashtag
        fields = ['name', 'usage_count', 'score', 'rank']
