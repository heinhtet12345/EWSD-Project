from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("interaction", "0004_report_target_type"),
    ]

    operations = [
        migrations.AlterModelTable(
            name="comment",
            table="Comment",
        ),
        migrations.AlterModelTable(
            name="vote",
            table="Vote",
        ),
        migrations.AlterModelTable(
            name="report",
            table="Report",
        ),
    ]
