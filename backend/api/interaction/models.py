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
    class TargetType(models.TextChoices):
        POST = "POST", "Post"
        COMMENT = "COMMENT", "Comment"
        USER = "USER", "User"

    class Reason(models.TextChoices):
        SWEARING = "SWEARING", "Swearing"
        LIBEL = "LIBEL", "Libel"
        SPAM = "SPAM", "Spam"
        HARASSMENT = "HARASSMENT", "Harassment"
        OTHER = "OTHER", "Other"

    class Status(models.TextChoices):
        IN_REVIEW = "IN_REVIEW", "In Review"
        ACCEPTED = "ACCEPTED", "Accepted"
        REJECTED = "REJECTED", "Rejected"
        RESOLVED = "RESOLVED", "Resolved"

    report_id = models.AutoField(primary_key=True)
    target_type = models.CharField(
        max_length=20,
        choices=TargetType.choices,
    )
    reason = models.CharField(max_length=20, choices=Reason.choices)
    details = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.IN_REVIEW,
    )
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
        null=True,
        blank=True,
    )
    comment = models.ForeignKey(
        "interaction.Comment",
        on_delete=models.CASCADE,
        related_name="reports",
        null=True,
        blank=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["reporter", "idea", "reason"],
                condition=models.Q(idea__isnull=False),
                name="unique_idea_report_per_reason",
            ),
            models.UniqueConstraint(
                fields=["reporter", "comment", "reason"],
                condition=models.Q(comment__isnull=False),
                name="unique_comment_report_per_reason",
            ),
        ]

    def __str__(self):
        target = f"Idea {self.idea.idea_id}" if self.idea else f"Comment {self.comment_id}"
        return f"Report {self.report_id} ({self.reason}) on {target}"

    def save(self, *args, **kwargs):
        if self.comment_id:
            self.target_type = self.TargetType.COMMENT
        elif self.idea_id:
            self.target_type = self.TargetType.POST
        elif not self.target_type:
            self.target_type = self.TargetType.USER
        super().save(*args, **kwargs)
