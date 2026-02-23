from time import timezone
from django.db import models
from jsonschema import ValidationError
class ClosurePeriod(models.Model):
    
    start_date = models.DateField(auto_now_add=True)
    idea_closure_date = models.DateField()
    comment_closure_date = models.DateField()
    is_active = models.BooleanField(default=True)
    academic_year = models.CharField(max_length=20)

    def clean(self):
        # Ensure comment closure is not before idea closure
        if self.comment_closure_date <= self.idea_closure_date:
            raise ValidationError(
                "Comment closure date must be after idea closure date."
            )

    @property
    def is_idea_open(self):
        return timezone.now() < self.idea_closure_date

    @property
    def is_comment_open(self):
        return timezone.now() < self.comment_closure_date

    def __str__(self):
        return f"Idea closes: {self.idea_closure_date} | Comment closes: {self.comment_closure_date}"