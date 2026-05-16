import { useEffect, useState } from "react";

export type StudentAcademicProfile = {
  school: string;
  className: string;
  subjects: string[];
  completed: boolean;
};

const STORAGE_KEY = "aetherlearn.student.academic.profile.v1";

const listeners = new Set<(profile: StudentAcademicProfile | null) => void>();
let memoryProfile: StudentAcademicProfile | null = null;

function webStorage() {
  if (typeof globalThis === "undefined") return null;
  const maybeWindow = globalThis as typeof globalThis & {
    localStorage?: Storage;
  };
  return maybeWindow.localStorage ?? null;
}

function normalize(value: unknown): StudentAcademicProfile | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Partial<StudentAcademicProfile>;
  if (!candidate.school || !candidate.className || !Array.isArray(candidate.subjects)) {
    return null;
  }
  return {
    school: candidate.school,
    className: candidate.className,
    subjects: candidate.subjects.filter(Boolean),
    completed: candidate.completed === true
  };
}

export function getStudentAcademicProfile() {
  if (memoryProfile) return memoryProfile;
  try {
    const raw = webStorage()?.getItem(STORAGE_KEY);
    memoryProfile = raw ? normalize(JSON.parse(raw)) : null;
  } catch {
    memoryProfile = null;
  }
  return memoryProfile;
}

export function saveStudentAcademicProfile(profile: StudentAcademicProfile) {
  memoryProfile = profile;
  try {
    webStorage()?.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // In native demo builds this still works in memory for the active session.
  }
  listeners.forEach((listener) => listener(memoryProfile));
}

export function isStudentAcademicProfileComplete() {
  return getStudentAcademicProfile()?.completed === true;
}

export function useStudentAcademicProfile() {
  const [profile, setProfile] = useState<StudentAcademicProfile | null>(() => getStudentAcademicProfile());

  useEffect(() => {
    listeners.add(setProfile);
    return () => {
      listeners.delete(setProfile);
    };
  }, []);

  return profile;
}
