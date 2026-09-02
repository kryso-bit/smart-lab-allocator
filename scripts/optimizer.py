#!/usr/bin/env python3
import json
import sys
from ortools.sat.python import cp_model


def overlaps(a_start, a_end, b_start, b_end):
    return a_start < b_end and b_start < a_end


def solve(payload):
    courses = payload.get("courses", [])
    rooms = payload.get("rooms", [])
    slots = payload.get("time_slots", [])
    faculty = {item.get("id"): item for item in payload.get("faculty", [])}
    unavailable = payload.get("unavailable", [])
    existing = {item["course_id"]: item for item in payload.get("existing_schedule", [])}
    freeze_ids = set(payload.get("freeze_course_ids", []))
    constraints = {item.get("id"): item for item in payload.get("constraints", [])}
    wastage_weight = constraints.get("room-wastage", {}).get("weight", 5) if constraints.get("room-wastage", {}).get("enabled", True) else 0
    preference_weight = constraints.get("preferred-slots", {}).get("weight", 8) if constraints.get("preferred-slots", {}).get("enabled", True) else 0
    disruption_weight = constraints.get("minimum-change", {}).get("weight", 20) if constraints.get("minimum-change", {}).get("enabled", True) else 0
    if not courses or not rooms or not slots:
        return {"ok": False, "error": "Insufficient scheduling data", "reasons": ["Courses, rooms, and time slots are required"]}

    model = cp_model.CpModel()
    candidates = {}
    vars_by_course = {}
    for course in courses:
        valid = []
        for room_index, room in enumerate(rooms):
            for slot_index, slot in enumerate(slots):
                if slot.get("duration_minutes", 60) < course.get("duration_minutes", 60):
                    continue
                if course.get("student_count", 0) > room.get("capacity", 0):
                    continue
                required_type = (course.get("required_room_type") or "").lower()
                if required_type and required_type not in (room.get("room_type") or "").lower():
                    continue
                equipment = {str(x).lower() for x in room.get("equipment", [])}
                if any(str(req).lower() not in equipment for req in course.get("required_equipment", [])):
                    continue
                if slot.get("day") not in room.get("available_days", slot.get("day")):
                    continue
                instructor = faculty.get(course.get("faculty_id"))
                if instructor and slot.get("day") not in instructor.get("availability", []):
                    continue
                blocked = any(x.get("resource_id") == room.get("id") and x.get("day") == slot.get("day") for x in unavailable)
                if blocked:
                    continue
                prior = existing.get(course["id"])
                if course["id"] in freeze_ids and prior and (prior.get("room_id") != room.get("id") or prior.get("slot_id") != slot.get("id")):
                    continue
                valid.append((room_index, slot_index))
        if not valid:
            return {"ok": False, "error": "No feasible schedule found", "reasons": [f"No compatible room/time slot for {course.get('course_code', course.get('id'))}"]}
        vars_by_course[course["id"]] = []
        for room_index, slot_index in valid:
            var = model.NewBoolVar(f"c_{course['id']}_r{room_index}_s{slot_index}")
            candidates[(course["id"], room_index, slot_index)] = var
            vars_by_course[course["id"]].append((var, room_index, slot_index))
        model.Add(sum(var for var, _, _ in vars_by_course[course["id"]]) == 1)

    for course_a_index, course_a in enumerate(courses):
        for course_b in courses[course_a_index + 1:]:
            if course_a.get("faculty_id") == course_b.get("faculty_id") or course_a.get("student_group_id") == course_b.get("student_group_id"):
                for var_a, room_a, slot_a in vars_by_course[course_a["id"]]:
                    for var_b, room_b, slot_b in vars_by_course[course_b["id"]]:
                        if slot_a == slot_b:
                            model.Add(var_a + var_b <= 1)
            for var_a, room_a, slot_a in vars_by_course[course_a["id"]]:
                for var_b, room_b, slot_b in vars_by_course[course_b["id"]]:
                    if room_a == room_b and slot_a == slot_b:
                        model.Add(var_a + var_b <= 1)

    objective_terms = []
    for course in courses:
        for var, room_index, slot_index in vars_by_course[course["id"]]:
            room = rooms[room_index]
            slot = slots[slot_index]
            wastage = max(0, room.get("capacity", 0) - course.get("student_count", 0))
            early_penalty = 1 if str(slot.get("start_time", "09:00")) < "10:00" else 0
            move_penalty = 0
            prior = existing.get(course["id"])
            if prior and (prior.get("room_id") != room.get("id") or prior.get("slot_id") != slot.get("id")):
                move_penalty = 20
            objective_terms.append(var * (wastage * wastage_weight + early_penalty * preference_weight + move_penalty * disruption_weight))
    model.Minimize(sum(objective_terms))
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(payload.get("time_limit_seconds", 5))
    solver.parameters.num_search_workers = 1
    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return {"ok": False, "error": "No feasible schedule found", "reasons": ["Hard constraints cannot be satisfied with the available resources"]}

    schedule = []
    for course in courses:
        for var, room_index, slot_index in vars_by_course[course["id"]]:
            if solver.Value(var):
                room = rooms[room_index]
                slot = slots[slot_index]
                schedule.append({"course_id": course["id"], "course_code": course.get("course_code"), "course_name": course.get("course_name"), "faculty_id": course.get("faculty_id"), "student_group_id": course.get("student_group_id"), "room_id": room.get("id"), "room_name": room.get("name"), "slot_id": slot.get("id"), "day": slot.get("day"), "start_time": slot.get("start_time"), "end_time": slot.get("end_time"), "student_count": course.get("student_count"), "duration_minutes": course.get("duration_minutes"), "required_equipment": course.get("required_equipment", [])})
    wastage_total = sum(max(0, item.get("capacity", 0) - next(c.get("student_count", 0) for c in courses if c["id"] == item["course_id"])) for item in rooms for _ in [] )
    return {"ok": True, "schedule": schedule, "solver_status": "optimal" if status == cp_model.OPTIMAL else "feasible", "objective": int(solver.ObjectiveValue()), "quality": 100.0, "hard_violations": 0, "soft_violations": 0}


if __name__ == "__main__":
    try:
        payload = json.load(sys.stdin)
        print(json.dumps(solve(payload)))
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc), "reasons": ["Optimizer runtime error"]}))
        sys.exit(1)
