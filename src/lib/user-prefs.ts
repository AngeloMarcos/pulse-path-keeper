import { useEffect, useState } from "react";

const HOSPITAL_KEY = "sgat:hospital_name";
const CONTRAST_KEY = "sgat:high_contrast";

export const DEFAULT_HOSPITAL = "Hospital — Agência Transfusional";

export function getHospitalName(): string {
  if (typeof window === "undefined") return DEFAULT_HOSPITAL;
  return localStorage.getItem(HOSPITAL_KEY) || DEFAULT_HOSPITAL;
}
export function setHospitalName(v: string) {
  localStorage.setItem(HOSPITAL_KEY, v);
  window.dispatchEvent(new Event("sgat:settings-change"));
}

export function getHighContrast(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CONTRAST_KEY) === "1";
}
export function setHighContrast(v: boolean) {
  localStorage.setItem(CONTRAST_KEY, v ? "1" : "0");
  document.documentElement.classList.toggle("high-contrast", v);
  window.dispatchEvent(new Event("sgat:settings-change"));
}

export function useUserPrefs() {
  const [hospital, setH] = useState<string>(getHospitalName());
  const [contrast, setC] = useState<boolean>(getHighContrast());
  useEffect(() => {
    const onChange = () => { setH(getHospitalName()); setC(getHighContrast()); };
    window.addEventListener("sgat:settings-change", onChange);
    return () => window.removeEventListener("sgat:settings-change", onChange);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", contrast);
  }, [contrast]);
  return { hospital, contrast, setHospital: setHospitalName, setContrast: setHighContrast };
}
