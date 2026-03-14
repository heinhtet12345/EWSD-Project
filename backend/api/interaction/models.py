from django.db import models
from django.conf import settings


class Comment(models.Model):

    cmt_id = models.AutoField(primary_key=True)

    cmt_content = models.CharField(max_length=256)

    anonymous_status = models.BooleanField(default=False)

    cmt_datetime = models.DateTimeField(auto_now_add=True)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comments'
    )

    idea = models.ForeignKey(
        'IdeaPost.Idea',
        on_delete=models.CASCADE,
        related_name='comments'
    )

    def __str__(self):
        return f"Comment {self.cmt_id} on Idea {self.idea.idea_id}"

class Vote(models.Model):

    class VoteType(models.TextChoices):
        UPVOTE = 'UP', 'Upvote'
        DOWNVOTE = 'DOWN', 'Downvote'

    vote_id = models.AutoField(primary_key=True)

    vote_type = models.CharField(
        max_length=4,
        choices=VoteType.choices
    )

    vote_datetime = models.DateTimeField(auto_now_add=True)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='votes'
    )

    idea = models.ForeignKey(
        'IdeaPost.Idea',
        on_delete=models.CASCADE,
        related_name='votes'
    )

    class Meta:
        unique_together = ('user', 'idea')

    def __str__(self):
        return f"{self.vote_type} by {self.user} on Idea {self.idea.idea_id}"


class Report(models.Model):
    class Reason(models.TextChoices):
        SWEARING = "SWEARING", "Swearing"
        LIBEL = "LIBEL", "Libel"
        SPAM = "SPAM", "Spam"
        HARASSMENT = "HARASSMENT", "Harassment"
        OTHER = "OTHER", "Other"

    report_id = models.AutoField(primary_key=True)
    reason = models.CharField(max_length=20, choices=Reason.choices)
    details = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="idea_reports",
    )
    idea = models.ForeignKey(
        "IdeaPost.Idea",
        on_delete=models.CASCADE,
        related_name="reports",
    )

    class Meta:
        unique_together = ("reporter", "idea", "reason")

    def __str__(self):
        return f"Report {self.report_id} ({self.reason}) on Idea {self.idea.idea_id}"
