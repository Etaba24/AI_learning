from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase

from accounts.models import User


class LeconVideoUploadTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.instructor = User.objects.create_user(
            email="formateur@example.com",
            password="strong-password-123",
            role=User.Role.INSTRUCTOR,
        )
        self.client.force_authenticate(user=self.instructor)

    def test_video_upload_rejects_files_above_100_mo(self):
        fichier = SimpleUploadedFile(
            "large-video.mp4",
            b"x" * (100 * 1024 * 1024 + 1),
            content_type="video/mp4",
        )

        response = self.client.post(reverse("lecon-video-upload"), {"fichier": fichier}, format="multipart")

        self.assertEqual(response.status_code, 400)
        self.assertIn("100 Mo", response.data["detail"])
