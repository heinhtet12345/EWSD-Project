import hashlib
from datetime import date

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from api.password_rules import validate_custom_password_rules
from api.models import Category, Department, Role

User = get_user_model()


DEPARTMENTS = [
    "Academic Affairs Department",
    "Student Support Services",
    "Quality Assurance & Evaluation",
    "Teacher Development & Training",
    "Curriculum Development Department",
]


STAFF_BY_DEPARTMENT = {
    "Academic Affairs Department": [
        ("aung.kyaw", "Aung", "Kyaw", date(2018, 2, 14)),
        ("kavya.rajan", "Kavya", "Rajan", date(2020, 6, 10)),
        ("li.wei", "Li", "Wei", date(2017, 9, 5)),
        ("mohammed.ali", "Mohammed", "Ali", date(2021, 3, 18)),
        ("zaw.lin", "Zaw", "Lin", date(2019, 11, 22)),
        ("arjun.patel", "Arjun", "Patel", date(2016, 8, 30)),
        ("siti.nur", "Siti", "Nur", date(2022, 1, 12)),
        ("meena.shankar", "Meena", "Shankar", date(2018, 4, 9)),
        ("nay.soe", "Nay", "Soe", date(2020, 7, 25)),
        ("fatima.hassan", "Fatima", "Hassan", date(2019, 12, 3)),
    ],
    "Student Support Services": [
        ("thu.rain", "Thu", "Rain", date(2017, 5, 14)),
        ("lakshmi.narayanan", "Lakshmi", "Narayanan", date(2021, 2, 20)),
        ("kim.minjun", "Kim", "Minjun", date(2018, 10, 6)),
        ("ahmed.yusuf", "Ahmed", "Yusuf", date(2019, 6, 17)),
        ("ye.htun", "Ye", "Htun", date(2022, 8, 11)),
        ("revathi.iyer", "Revathi", "Iyer", date(2016, 3, 29)),
        ("lin.htet", "Lin", "Htet", date(2020, 9, 13)),
        ("karthik.raja", "Karthik", "Raja", date(2018, 1, 8)),
        ("aung.thu", "Aung", "Thu", date(2021, 11, 19)),
        ("pooja.ram", "Pooja", "Ram", date(2019, 4, 27)),
    ],
    "Quality Assurance & Evaluation": [
        ("htet.aung", "Htet", "Aung", date(2017, 7, 7)),
        ("arvind.kumar", "Arvind", "Kumar", date(2020, 5, 21)),
        ("su.mon", "Su", "Mon", date(2018, 2, 11)),
        ("yuki.nakamura", "Yuki", "Nakamura", date(2022, 9, 2)),
        ("youssef.ali", "Youssef", "Ali", date(2019, 12, 15)),
        ("kyi.zin", "Kyi", "Zin", date(2016, 6, 4)),
        ("rahul.sharma", "Rahul", "Sharma", date(2021, 3, 10)),
        ("sakura.sato", "Sakura", "Sato", date(2018, 8, 23)),
        ("min.thu", "Min", "Thu", date(2020, 1, 30)),
        ("fatimah.noor", "Fatimah", "Noor", date(2019, 10, 12)),
    ],
    "Teacher Development & Training": [
        ("elena.edwards", "Elena", "Edwards", date(2018, 3, 14)),
        ("felix.ford", "Felix", "Ford", date(2021, 7, 19)),
        ("aung.myint", "Aung", "Myint", date(2017, 5, 23)),
        ("priya.nair", "Priya", "Nair", date(2022, 10, 6)),
        ("isla.ingram", "Isla", "Ingram", date(2019, 9, 2)),
        ("jack.james", "Jack", "James", date(2016, 8, 12)),
        ("keira.knight", "Keira", "Knight", date(2023, 4, 4)),
        ("leo.lawson", "Leo", "Lawson", date(2020, 11, 16)),
        ("mona.morris", "Mona", "Morris", date(2018, 1, 31)),
        ("nolan.nash", "Nolan", "Nash", date(2021, 12, 7)),
    ],
    "Curriculum Development Department": [
        ("ophelia.ortega", "Ophelia", "Ortega", date(2017, 4, 26)),
        ("peter.prince", "Peter", "Prince", date(2020, 6, 8)),
        ("queen.quinn", "Queen", "Quinn", date(2019, 10, 27)),
        ("ryan.reed", "Ryan", "Reed", date(2022, 2, 15)),
        ("sophia.sanders", "Sophia", "Sanders", date(2018, 7, 20)),
        ("trent.taylor", "Trent", "Taylor", date(2016, 11, 3)),
        ("ursula.ulrich", "Ursula", "Ulrich", date(2023, 5, 9)),
        ("vincent.vaughn", "Vincent", "Vaughn", date(2021, 1, 18)),
        ("willow.white", "Willow", "White", date(2019, 3, 25)),
        ("zoe.zane", "Zoe", "Zane", date(2020, 12, 14)),
    ],
}


COORDINATORS = {
    "Academic Affairs Department": ("coord.academic", "Suresh", "Iyer", date(2015, 1, 1)),
    "Student Support Services": ("coord.student", "Aye", "Chan", date(2016, 2, 2)),
    "Quality Assurance & Evaluation": ("coord.quality", "Hassan", "Ali", date(2017, 3, 3)),
    "Teacher Development & Training": ("coord.teacher", "Mina", "Khan", date(2018, 4, 4)),
    "Curriculum Development Department": ("coord.curriculum", "Chen", "Wei", date(2019, 5, 5)),
}


def build_email(username: str) -> str:
    return f"{username}@example.edu"


def build_phone(seed_number: int) -> str:
    return f"09{seed_number:08d}"


def build_address(index: int, department_name: str) -> tuple[str, str, str, str]:
    township_options = ["Kamayut", "Hlaing", "Mayangone", "Bahan", "Sanchaung"]
    city = "Yangon"
    township = township_options[index % len(township_options)]
    address_line_1 = f"No. {12 + index}, {department_name.split()[0]} Street"
    postal_code = f"11{100 + index}"
    return address_line_1, township, city, postal_code


def generate_password(username: str, hire_date: date, seed_number: int) -> str:
    special_characters = "!@#$%&*?"
    digest = hashlib.sha256(f"{username}-{hire_date.isoformat()}-{seed_number}".encode("utf-8")).hexdigest()

    uppercase_char = username[0].upper()
    lowercase_char = next((char for char in username if char.isalpha() and char.islower()), "a")
    number_part = f"{(hire_date.year + seed_number) % 100:02d}"
    special_char = special_characters[seed_number % len(special_characters)]

    hash_chunk = []
    for index, char in enumerate(digest):
        if char.isalpha() and index % 2 == 0:
            hash_chunk.append(char.upper())
        else:
            hash_chunk.append(char)
        if len(hash_chunk) == 7:
            break

    password = f"{uppercase_char}{lowercase_char}{special_char}{number_part}{''.join(hash_chunk)}"

    validation_error = validate_custom_password_rules(password)
    if validation_error:
        raise ValueError(f"Generated password for {username} is invalid: {validation_error}")

    return password


class Command(BaseCommand):
    help = "Seed database with departments, users, and categories"

    def handle(self, *args, **kwargs):
        dept_objects: dict[str, Department] = {}
        for department_name in DEPARTMENTS:
            dept, created = Department.objects.get_or_create(dept_name=department_name)
            dept_objects[department_name] = dept
            if created:
                self.stdout.write(f"Created Department: {dept.dept_name}")

        roles = ["admin", "qa_manager", "qa_coordinator", "staff"]
        role_objects = {}
        for role_name in roles:
            role, created = Role.objects.get_or_create(role_name=role_name.title().replace("_", " "))
            role_objects[role_name] = role
            if created:
                self.stdout.write(f"Created Role: {role.role_name}")

        base_users = [
            {
                "username": "admin",
                "first_name": "System",
                "last_name": "Admin",
                "email": build_email("admin"),
                "role": "admin",
                "department": None,
                "hire_date": date(2010, 1, 1),
            },
            {
                "username": "qa_manager",
                "first_name": "David",
                "last_name": "Smith",
                "email": build_email("qa_manager"),
                "role": "qa_manager",
                "department": None,
                "hire_date": date(2012, 6, 15),
            },
        ]

        users_to_create = []
        users_to_create.extend(base_users)

        for department_name, (username, first_name, last_name, hire_date) in COORDINATORS.items():
            users_to_create.append(
                {
                    "username": username,
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": build_email(username),
                    "role": "qa_coordinator",
                    "department": department_name,
                    "hire_date": hire_date,
                }
            )

        for department_name, staff_members in STAFF_BY_DEPARTMENT.items():
            for index, (username, first_name, last_name, hire_date) in enumerate(staff_members, start=1):
                users_to_create.append(
                    {
                        "username": username,
                        "first_name": first_name,
                        "last_name": last_name,
                        "email": build_email(username),
                        "role": "staff",
                        "department": department_name,
                        "hire_date": hire_date,
                        "address_index": index,
                    }
                )

        for user_index, user_data in enumerate(users_to_create, start=1):
            username = user_data["username"]
            if User.objects.filter(username=username).exists():
                continue

            department_name = user_data.get("department")
            department = dept_objects.get(department_name) if department_name else None
            address_line_1, township, city, postal_code = build_address(
                user_data.get("address_index", user_index),
                department_name or "Administration",
            )
            password = generate_password(username, user_data["hire_date"], user_index)

            user = User.objects.create_user(
                username=username,
                email=user_data["email"],
                password=password,
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                role=role_objects[user_data["role"]],
                department=department,
                hire_date=user_data["hire_date"],
                active_status=True,
                is_active=True,
                phone=build_phone(user_index),
                address_line_1=address_line_1,
                township=township,
                city=city,
                postal_code=postal_code,
                profile_image=None,
            )
            self.stdout.write(f"Created User: {user.username} | Password: {password}")

        categories_data = [
            {"name": "Teaching Quality", "desc": "Quality of teaching and instruction"},
            {"name": "Course Content", "desc": "Content and structure of courses"},
            {"name": "Assessment Methods", "desc": "Methods used for student assessment"},
            {"name": "Student Support", "desc": "Support services for students"},
            {"name": "Online Learning", "desc": "Online and digital learning resources"},
            {"name": "Classroom Facilities", "desc": "Physical classroom and facilities"},
            {"name": "Library Resources", "desc": "Library and research resources"},
            {"name": "IT Infrastructure", "desc": "Information technology infrastructure"},
            {"name": "Research Support", "desc": "Support for research activities"},
            {"name": "Administrative Processes", "desc": "Administrative and bureaucratic processes"},
            {"name": "Communication", "desc": "Communication within the institution"},
            {"name": "Campus Safety", "desc": "Safety and security on campus"},
            {"name": "Environmental Sustainability", "desc": "Environmental and sustainability efforts"},
            {"name": "Accessibility", "desc": "Accessibility for all users"},
            {"name": "Student Engagement", "desc": "Engagement and involvement of students"},
            {"name": "Internship Programs", "desc": "Programs for internships and work experience"},
            {"name": "Industry Collaboration", "desc": "Collaboration with industry partners"},
            {"name": "Academic Advising", "desc": "Academic advising and guidance"},
            {"name": "Staff Training", "desc": "Training and development for staff"},
            {"name": "Workload Management", "desc": "Management of workload and stress"},
            {"name": "Timetable Scheduling", "desc": "Scheduling of classes and timetables"},
            {"name": "Course Registration", "desc": "Process for registering for courses"},
            {"name": "Digital Tools", "desc": "Digital tools and software used"},
            {"name": "Data Management", "desc": "Management of data and information"},
            {"name": "Innovation Programs", "desc": "Programs promoting innovation"},
            {"name": "Quality Assurance", "desc": "Assurance of quality in processes"},
            {"name": "Performance Evaluation", "desc": "Evaluation of performance"},
            {"name": "Feedback Systems", "desc": "Systems for collecting feedback"},
            {"name": "Student Wellbeing", "desc": "Wellbeing and mental health of students"},
            {"name": "Mental Health Support", "desc": "Support for mental health"},
            {"name": "Campus Transport", "desc": "Transportation services on campus"},
            {"name": "Food Services", "desc": "Food and dining services"},
            {"name": "Accommodation", "desc": "Housing and accommodation options"},
            {"name": "International Programs", "desc": "Programs for international students"},
            {"name": "Community Engagement", "desc": "Engagement with the local community"},
            {"name": "Event Management", "desc": "Management of events and activities"},
            {"name": "Learning Spaces", "desc": "Spaces designed for learning"},
            {"name": "Career Services", "desc": "Services for career development"},
            {"name": "Alumni Relations", "desc": "Relations with alumni"},
            {"name": "Policy Improvement", "desc": "Improvement of institutional policies"},
        ]

        for cat_data in categories_data:
            category, created = Category.objects.get_or_create(
                category_name=cat_data["name"],
                defaults={"category_desc": cat_data["desc"]},
            )
            if created:
                self.stdout.write(f"Created Category: {category.category_name}")

        self.stdout.write(
            self.style.SUCCESS(
                "Seeding completed with 5 departments, 1 admin, 1 QA manager, 5 QA coordinators, and 50 staff accounts."
            )
        )
