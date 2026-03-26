from django.db import migrations, models


def populate_report_target_type(apps, schema_editor):
    Report = apps.get_model("interaction", "Report")

    for report in Report.objects.all():
        if getattr(report, "comment_id", None):
            report.target_type = "COMMENT"
        elif getattr(report, "idea_id", None):
            report.target_type = "POST"
        else:
            report.target_type = "USER"
        report.save(update_fields=["target_type"])


class Migration(migrations.Migration):

    dependencies = [
        ("interaction", "0003_report_status_and_comment_target"),
    ]

    operations = [
        migrations.AddField(
            model_name="report",
            name="target_type",
            field=models.CharField(
                choices=[
                    ("POST", "Post"),
                    ("COMMENT", "Comment"),
                    ("USER", "User"),
                ],
                default="POST",
                max_length=20,
            ),
            preserve_default=False,
        ),
        migrations.RunPython(populate_report_target_type, migrations.RunPython.noop),
    ]
