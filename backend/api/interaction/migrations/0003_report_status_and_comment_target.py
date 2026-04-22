from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("interaction", "0002_report"),
    ]

    operations = [
        migrations.AddField(
            model_name="report",
            name="comment",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="reports",
                to="interaction.comment",
            ),
        ),
        migrations.AddField(
            model_name="report",
            name="status",
            field=models.CharField(
                choices=[
                    ("IN_REVIEW", "In Review"),
                    ("ACCEPTED", "Accepted"),
                    ("REJECTED", "Rejected"),
                    ("RESOLVED", "Resolved"),
                ],
                default="IN_REVIEW",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="report",
            name="idea",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="reports",
                to="IdeaPost.idea",
            ),
        ),
        migrations.AlterModelOptions(
            name="report",
            options={},
        ),
        migrations.AlterUniqueTogether(
            name="report",
            unique_together=set(),
        ),
        migrations.AddConstraint(
            model_name="report",
            constraint=models.UniqueConstraint(
                condition=models.Q(idea__isnull=False),
                fields=("reporter", "idea", "reason"),
                name="unique_idea_report_per_reason",
            ),
        ),
        migrations.AddConstraint(
            model_name="report",
            constraint=models.UniqueConstraint(
                condition=models.Q(comment__isnull=False),
                fields=("reporter", "comment", "reason"),
                name="unique_comment_report_per_reason",
            ),
        ),
    ]
