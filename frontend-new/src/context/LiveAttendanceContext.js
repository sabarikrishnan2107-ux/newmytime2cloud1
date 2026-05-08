"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import useMqtt from "@/hooks/useMqtt";
import useSse from "@/hooks/useSse";
import { getDeviceJson, getEmployeesJson } from "@/lib/api";
import { getUser } from "@/config";
import { getLateMinutes } from "@/hooks/useLateMinutes";

const LiveAttendanceContext = createContext({
  lastAttendanceEvent: null,
});

const WS_ENDPOINT = "wss://sdk.mytime2cloud.com/WebSocket";
const WS_RECONNECT_INTERVAL = 5000;

const verificationMethods = {
  1: "Card",
  2: "Fing",
  3: "Face",
  4: "Fing + Card",
  5: "Face + Fing",
  6: "Face + Card",
  7: "Card + Pin",
  8: "Face + Pin",
  9: "Fing + Pin",
  10: "Manual",
  11: "Fing + Card + Pin",
  12: "Face + Card + Pin",
  13: "Face + Fing + Pin",
  14: "Face + Fing + Card",
  15: "Repeated",
};

const deniedReasons = {
  16: "Date Expire",
  17: "Timezone Expire",
  18: "Holiday",
  19: "Unregistered",
  20: "Detection lock",
  23: "Loss Card",
  24: "Blacklisted",
  25: "Without Verification",
  26: "No Card Verification",
  27: "No Fingerprint",
};

const defaultPunctuality = {
  punctuality: "On Time",
  punctualityColor: "text-emerald-600",
  punctualityDot: "bg-emerald-500",
};

function getPunctualityFromShift(shift, logTime) {
  if (!shift || shift.shift_type_id == 1 || shift.shift_type_id == 2) {
    return defaultPunctuality;
  }

  const arrivalDateTime = typeof logTime === "string" ? logTime : "";
  const hasDatePart = arrivalDateTime.includes(" ");
  const dutyTime = shift?.on_duty_time
    ? shift.on_duty_time.length === 5
      ? `${shift.on_duty_time}:00`
      : shift.on_duty_time
    : null;

  if (!hasDatePart || !dutyTime) {
    return defaultPunctuality;
  }

  const shiftDate = arrivalDateTime.split(" ")[0];
  const shiftStartDateTime = `${shiftDate} ${dutyTime}`;
  const lateMinutes = getLateMinutes(
    arrivalDateTime,
    shiftStartDateTime,
    shift?.grace_time || "00:00",
  );

  if (lateMinutes > 0) {
    return {
      punctuality: "Late",
      punctualityColor: "text-amber-600",
      punctualityDot: "bg-amber-500",
    };
  }

  return defaultPunctuality;
}

export function LiveAttendanceProvider({ children }) {
  const user = getUser();
  const { lastMessage } = useMqtt(["mqtt/face/+/+"]);
  const companyId = user?.company_id;

  const [deviceJson, setDeviceJson] = useState(null);
  const [employeesJson, setEmployeesJson] = useState(null);
  const [lastAttendanceEvent, setLastAttendanceEvent] = useState(null);

  useEffect(() => {
    const fetchJson = async () => {
      if (!companyId) return;

      setDeviceJson(await getDeviceJson(companyId));
      setEmployeesJson(await getEmployeesJson(companyId));
    };

    fetchJson();
  }, [companyId]);

  useEffect(() => {
    if (!lastMessage || lastMessage.topic.includes("heartbeat")) return;
    if (!deviceJson || !employeesJson) return;

    const {
      data: { customId, personName, facesluiceId, time, VerifyStatus, pic },
    } = lastMessage;

    const foundInfo = deviceJson[facesluiceId];
    const foundEmployeeInfo = employeesJson[customId];

    if (!foundInfo || !foundEmployeeInfo) return;

    const shift = foundEmployeeInfo?.schedule?.shift;
    const { punctuality, punctualityColor, punctualityDot } =
      getPunctualityFromShift(shift, time);


    const customDate = time;
    if (!customDate || typeof customDate !== "string") return;

    let customTime = new Date(customDate.replace(' ', 'T')).toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Dubai',
      hour: '2-digit',
      minute: '2-digit'
    });

    setLastAttendanceEvent({
      eventId: `${customId}-${facesluiceId}-${customTime}`,
      source: "mqtt",
      customId,
      personName,
      time: customTime,
      profile_picture: foundEmployeeInfo.profile_picture,
      status: VerifyStatus == "1" ? "Allowed" : "",
      punctuality,
      punctualityColor,
      punctualityDot,
      dept: `${foundEmployeeInfo?.branch?.branch_name} ${foundEmployeeInfo?.branch?.branch_name
        ? " / " + foundEmployeeInfo?.department?.name
        : ""
        }`,
      location: foundInfo?.name || "-",
    });
  }, [lastMessage, deviceJson, employeesJson]);


  useSse({
    clientId: companyId,
    storeMessages: false,
    enabled: !!companyId,
    onMessage: (incoming) => {
      if (!incoming || typeof incoming !== "object") return;
      if (incoming.type && incoming.type !== "clock") return;
      if (!deviceJson || !employeesJson) return;

      const rawPayload =
        incoming.data && typeof incoming.data === "object"
          ? incoming.data
          : incoming;

      console.info("Raw SSE Payload:", rawPayload);

      const payloadList = Array.isArray(rawPayload) ? rawPayload : [rawPayload];

      payloadList.forEach((payload) => {
        if (!payload || typeof payload !== "object") return;
        if (!payload.time || typeof payload.time !== "string") return;

        const [hours, minutes] = payload.time.split(":");
        const myDate = new Date();
        myDate.setHours(hours, minutes);
        const customId = payload.user_id;
        const personName = payload.name;
        const facesluiceId = payload.device_id;
        const time = myDate.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });

        if (!customId || !personName || !time) return;

        const foundDeviceInfo = facesluiceId ? deviceJson?.[facesluiceId] : null;

        console.log(foundDeviceInfo);

        const foundEmployeeInfo = employeesJson?.[customId];
        if (!foundEmployeeInfo) return;

        const shift = foundEmployeeInfo?.schedule?.shift;

        const { punctuality, punctualityColor, punctualityDot } = getPunctualityFromShift(shift, time);


        let json = {
          ...payload,
          eventId: `${customId}-${facesluiceId || "sse"}-${time}`,
          source_type: "sse",
          customId,
          personName,
          time,
          profile_picture: payload.avatar,
          status: "Allowed",
          log_type: payload.log_type,
          punctuality,
          punctualityColor,
          punctualityDot,
          dept:
            payload.dept ||
            `${foundEmployeeInfo?.branch?.branch_name} ${foundEmployeeInfo?.branch?.branch_name
              ? " / " + foundEmployeeInfo?.department?.name
              : ""
            }`,
          location: payload.location,
        }

        console.info("SSE Received:", json);

        setLastAttendanceEvent(json);
      });
    },
  });

  // ── WebSocket (SDK devices) ──
  const deviceJsonRef = useRef(deviceJson);
  const employeesJsonRef = useRef(employeesJson);
  useEffect(() => { deviceJsonRef.current = deviceJson; }, [deviceJson]);
  useEffect(() => { employeesJsonRef.current = employeesJson; }, [employeesJson]);

  const hasLookupData = !!deviceJson && !!employeesJson;

  useEffect(() => {
    if (!companyId || !hasLookupData) return;

    let ws;
    let reconnectTimeout;
    let disposed = false;

    const connect = () => {
      if (disposed) return;

      ws = new WebSocket(WS_ENDPOINT);

      ws.onmessage = ({ data }) => {
        try {
          const devices = deviceJsonRef.current;
          const employees = employeesJsonRef.current;
          if (!devices || !employees) return;

          const parsed = JSON.parse(data);
          const jsonData = parsed?.Data;
          if (!jsonData) return;

          const { UserCode, SN, RecordDate, RecordNumber, RecordCode } = jsonData;
          if (!UserCode) return;

          const foundDeviceInfo = SN ? devices[SN] : null;
          const foundEmployeeInfo = employees[UserCode];
          if (!foundEmployeeInfo) return;

          const status = RecordCode > 15 ? "Access Denied" : "Allowed";
          const mode = verificationMethods[RecordCode] ?? "---";
          const reason = deniedReasons[RecordCode] ?? null;

          if (!RecordDate || typeof RecordDate !== "string") return;

          const time = new Date(RecordDate.replace(" ", "T")).toLocaleTimeString("en-GB", {
            timeZone: "Asia/Dubai",
            hour: "2-digit",
            minute: "2-digit",
          });

          const shift = foundEmployeeInfo?.schedule?.shift;
          const { punctuality, punctualityColor, punctualityDot } =
            getPunctualityFromShift(shift, RecordDate);

          setLastAttendanceEvent({
            eventId: `${UserCode}-${SN || "ws"}-${time}`,
            source: "websocket",
            customId: UserCode,
            personName: foundEmployeeInfo?.name || "Unknown",
            time,
            profile_picture: foundEmployeeInfo?.profile_picture,
            status,
            mode,
            reason,
            punctuality,
            punctualityColor,
            punctualityDot,
            dept: `${foundEmployeeInfo?.branch?.branch_name}${foundEmployeeInfo?.branch?.branch_name
                ? " / " + foundEmployeeInfo?.department?.name
                : ""
              }`,
            location: foundDeviceInfo?.name || "-",
          });
        } catch (error) {
          console.error("WebSocket message error:", error.message);
        }
      };

      ws.onclose = () => {
        if (!disposed) {
          reconnectTimeout = setTimeout(connect, WS_RECONNECT_INTERVAL);
        }
      };

      ws.onerror = () => { };
    };

    connect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [companyId, hasLookupData]);

  const value = useMemo(
    () => ({
      lastAttendanceEvent,
    }),
    [lastAttendanceEvent],
  );

  return (
    <LiveAttendanceContext.Provider value={value}>
      {children}
    </LiveAttendanceContext.Provider>
  );
}

export function useLiveAttendance() {
  return useContext(LiveAttendanceContext);
}
