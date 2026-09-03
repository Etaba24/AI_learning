from rest_framework import serializers
from .models import Quiz, Question, Choice, Exercice


class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ["id", "texte", "est_correcte"]


class QuestionSerializer(serializers.ModelSerializer):
    choix = ChoiceSerializer(many=True, required=False)

    class Meta:
        model = Question
        fields = ["id", "enonce", "ordre", "choix"]

    def create(self, validated_data):
        choix_data = validated_data.pop("choix", [])
        question = Question.objects.create(**validated_data)
        for choice in choix_data:
            Choice.objects.create(question=question, **choice)
        return question


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = ["id", "lecon", "module", "titre", "seuil_reussite", "questions"]
        read_only_fields = ["lecon", "module"]


class ExerciceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercice
        fields = ["id", "lecon", "enonce", "correction"]
        read_only_fields = ["lecon"]
