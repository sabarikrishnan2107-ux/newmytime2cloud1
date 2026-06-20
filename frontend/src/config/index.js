// /config/index.js
import { svcUrl } from "@/lib/runtimeHost";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || svcUrl("http", 8000, "/api");

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
