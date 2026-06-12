// /config/index.js
import { svcUrl } from "@/lib/runtimeHost";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || svcUrl("http", 8000, "/api");

export const FACE_VALIDATOR_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_FACE_VALIDATOR_ENDPOINT || svcUrl("http", 8500)
    : null;



export const APP_NAME = "MyTime2Cloud";
export const DEFAULT_LANGUAGE = "en";
export const DEV_NAME = "Francis";

export const user =
  typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("user")) || {}
    : {};



export const getUser = () => {
  return typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("user")) || {}
    : {};
}
