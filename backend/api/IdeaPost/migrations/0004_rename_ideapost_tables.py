from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("IdeaPost", "0003_alter_uploadeddocument_file_name"),
    ]

    operations = [
        migrations.AlterModelTable(
            name="idea",
            table="Idea",
        ),
        migrations.AlterModelTable(
            name="uploadeddocument",
            table="UploadedDocument",
        ),
    ]
