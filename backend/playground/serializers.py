from rest_framework import serializers


class RunCodeSerializer(serializers.Serializer):
    language = serializers.CharField()
    code = serializers.CharField(max_length=20000, allow_blank=False, trim_whitespace=False)
    stdin = serializers.CharField(max_length=5000, required=False, allow_blank=True, trim_whitespace=False)
