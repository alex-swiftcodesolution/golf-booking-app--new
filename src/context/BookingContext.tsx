/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import axios from "axios";
import {
  fetchGuestData,
  updateGuestData,
  updateMemberProfile,
} from "@/api/gymmaster";
import { Booking } from "@/lib/types";

interface BookingContextType {
  bookings: Booking[];
  addBooking: (
    booking: Omit<Booking, "id">,
    token: string,
    serviceId: number,
    resourceId: number,
    membershipId: number,
    benefitId?: number
  ) => Promise<number>;
  deleteBooking: (id: number, token: string) => void;
  updateBooking: (id: number, updatedBooking: Partial<Booking>) => void;
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

const GYMMASTER_API_KEY = process.env.NEXT_PUBLIC_GYMMASTER_API_KEY;

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);

  /*
  without db
  const addBooking = async (
    booking: Omit<Booking, "id">,
    token: string,
    serviceId: number,
    resourceId: number,
    membershipId: number,
    benefitId?: number
  ): Promise<number> => {
    try {
      const { date, time, servicename, guests, bay } = booking;
      const { hour, minute } = parseTimeSlot(time);
      const bookingstart = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}:00`;
      const duration = servicename.includes("1/2 hr") ? 30 : 60;
      const endHour = Math.floor((hour * 60 + minute + duration) / 60);
      const endMinute = (minute + duration) % 60;
      const bookingend = `${endHour.toString().padStart(2, "0")}:${endMinute
        .toString()
        .padStart(2, "0")}:00`;

      const bookingParams: Record<string, string> = {
        api_key: GYMMASTER_API_KEY || "",
        token,
        resourceid: resourceId.toString(),
        serviceid: serviceId.toString(),
        day: date,
        bookingstart,
        bookingend,
        roomid: "",
        equipmentid: "",
        membershipid: membershipId.toString(),
      };
      if (benefitId) {
        bookingParams.benefitid = benefitId.toString();
      }

      const response = await axios.post(
        "/api/gymmaster/v1/booking/servicebookings",
        new URLSearchParams(bookingParams),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      console.log("Booking API response:", response.data);

      if (response.data.error) {
        throw new Error(response.data.error || "Booking failed");
      }

      // Fallback: Fetch booking ID from /api/gymmaster/v2/member/bookings
      let newId: number;
      if (
        !response.data.result?.bookingid &&
        response.data.result === "success"
      ) {
        const bookingsResponse = await axios.get(
          "/api/gymmaster/v2/member/bookings",
          {
            params: {
              api_key: GYMMASTER_API_KEY || "",
              token,
            },
          }
        );
        console.log("Member bookings response:", bookingsResponse.data);

        const latestBooking = bookingsResponse.data.result?.servicebookings
          ?.filter(
            (b: any) =>
              b.day === date &&
              b.starttime === bookingstart &&
              b.name.toUpperCase() === bay.toUpperCase() // Match bay (e.g., "PLAYERS BAY")
          )
          .sort((a: any, b: any) => b.id - a.id)[0];

        if (!latestBooking) {
          throw new Error(
            `No matching booking found for date: ${date}, starttime: ${bookingstart}, bay: ${bay}`
          );
        }

        newId = Number(latestBooking.id);
        if (!Number.isInteger(newId) || newId <= 0) {
          throw new Error(
            `Invalid booking ID: ${newId} for date: ${date}, starttime: ${bookingstart}, bay: ${bay}`
          );
        }
      } else {
        newId = Number(response.data.result.bookingid);
        if (!Number.isInteger(newId) || newId <= 0) {
          throw new Error(`Invalid booking ID: ${newId}`);
        }
      }
      console.log("Generated booking ID:", newId);

      // Normalize time to AM/PM for consistency
      const [hourNum, minuteNum] = bookingstart.split(":").map(Number);
      const period = hourNum >= 12 ? "PM" : "AM";
      const displayHour =
        hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
      const displayTime = `${displayHour}:${minuteNum
        .toString()
        .padStart(2, "0")} ${period}`;

      // Format date to mm/dd/yy
      const [year, month, day] = date.split("-").map(Number);
      const formattedDate = `${month.toString().padStart(2, "0")}/${day
        .toString()
        .padStart(2, "0")}/${year.toString().slice(-2)}`;

      // Update guest data with retry logic
      if (guests.length > 0) {
        const guestData = await fetchGuestData(token);
        const updatedGuestBookingIds = [
          ...guestData.guestBookingIds,
          ...Array(guests.length).fill(newId),
        ].filter((id) => Number.isInteger(id) && id > 0);
        const updatedGuests = [
          ...guestData.guests,
          ...guests.filter(
            (newGuest) =>
              !guestData.guests.some(
                (existingGuest) =>
                  existingGuest.email === newGuest.email &&
                  existingGuest.name === newGuest.name &&
                  existingGuest.date === newGuest.date
              )
          ),
        ];
        const updatedGuestPassesUsed =
          guestData.guestPassesUsed + guests.length;

        let retryCount = 0;
        const maxRetries = 3;
        while (retryCount < maxRetries) {
          try {
            // Update customtext5 separately
            await updateMemberProfile(token, {
              customtext5: JSON.stringify(updatedGuestBookingIds),
            });
            // Update other fields
            await updateGuestData(
              token,
              updatedGuestPassesUsed,
              guestData.referralCodes,
              [], // Skip customtext5
              updatedGuests
            );
            console.log("Updated guest data fields:", {
              customtext5: updatedGuestBookingIds,
            });
            break;
          } catch (error: any) {
            if (error.response?.status === 413 && retryCount < maxRetries - 1) {
              console.warn(`Retry ${retryCount + 1} due to 413 error`);
              retryCount++;
              await new Promise((resolve) => setTimeout(resolve, 1000));
              continue;
            }
            throw error;
          }
        }
      }

      // Add booking, preserving servicename
      setBookings((prev) => {
        const exists = prev.find((b) => b.id === newId);
        if (exists) {
          return prev.map((b) =>
            b.id === newId
              ? {
                  ...booking,
                  id: newId,
                  time: displayTime,
                  date: formattedDate,
                }
              : b
          );
        }
        return [
          ...prev,
          { ...booking, id: newId, time: displayTime, date: formattedDate },
        ];
      });

      return newId;
    } catch (error) {
      console.error("Add booking error:", error);
      throw error;
    }
  };
  */

  /*
  db - no guest data
  const addBooking = async (
    booking: Omit<Booking, "id">,
    token: string,
    serviceId: number,
    resourceId: number,
    membershipId: number,
    benefitId?: number
  ): Promise<number> => {
    try {
      const { date, time, servicename, guests, bay, location } = booking;
      const { hour, minute } = parseTimeSlot(time);
      const bookingstart = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}:00`;
      const duration = servicename.includes("1/2 hr") ? 30 : 60;
      const endHour = Math.floor((hour * 60 + minute + duration) / 60);
      const endMinute = (minute + duration) % 60;
      const bookingend = `${endHour.toString().padStart(2, "0")}:${endMinute
        .toString()
        .padStart(2, "0")}:00`;

      const bookingParams: Record<string, string> = {
        api_key: GYMMASTER_API_KEY || "",
        token,
        resourceid: resourceId.toString(),
        serviceid: serviceId.toString(),
        day: date,
        bookingstart,
        bookingend,
        roomid: "",
        equipmentid: "",
        membershipid: membershipId.toString(),
      };
      if (benefitId) {
        bookingParams.benefitid = benefitId.toString();
      }

      const response = await axios.post(
        "/api/gymmaster/v1/booking/servicebookings",
        new URLSearchParams(bookingParams),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error || "Booking failed");
      }

      let newId: number;
      if (
        !response.data.result?.bookingid &&
        response.data.result === "success"
      ) {
        const bookingsResponse = await axios.get(
          "/api/gymmaster/v2/member/bookings",
          {
            params: {
              api_key: GYMMASTER_API_KEY || "",
              token,
            },
          }
        );
        const latestBooking = bookingsResponse.data.result?.servicebookings
          ?.filter(
            (b: any) =>
              b.day === date &&
              b.starttime === bookingstart &&
              b.name.toUpperCase() === bay.toUpperCase()
          )
          .sort((a: any, b: any) => b.id - a.id)[0];

        if (!latestBooking) {
          throw new Error(
            `No matching booking found for date: ${date}, starttime: ${bookingstart}, bay: ${bay}`
          );
        }
        newId = Number(latestBooking.id);
      } else {
        newId = Number(response.data.result.bookingid);
      }
      if (!Number.isInteger(newId) || newId <= 0) {
        throw new Error(`Invalid booking ID: ${newId}`);
      }

      // Save to MongoDB via API route
      await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: newId,
          date,
          time: bookingstart,
          location,
          bay,
          servicename,
          userId: token,
        }),
      });

      // Normalize time and date
      const [hourNum, minuteNum] = bookingstart.split(":").map(Number);
      const period = hourNum >= 12 ? "PM" : "AM";
      const displayHour =
        hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
      const displayTime = `${displayHour}:${minuteNum
        .toString()
        .padStart(2, "0")} ${period}`;
      const [year, month, day] = date.split("-").map(Number);
      const formattedDate = `${month.toString().padStart(2, "0")}/${day
        .toString()
        .padStart(2, "0")}/${year.toString().slice(-2)}`;

      // Update guest data (unchanged)
      if (guests.length > 0) {
        const guestData = await fetchGuestData(token);
        const updatedGuestBookingIds = [
          ...guestData.guestBookingIds,
          ...Array(guests.length).fill(newId),
        ].filter((id) => Number.isInteger(id) && id > 0);
        const updatedGuests = [
          ...guestData.guests,
          ...guests.filter(
            (newGuest) =>
              !guestData.guests.some(
                (existingGuest) =>
                  existingGuest.email === newGuest.email &&
                  existingGuest.name === newGuest.name &&
                  existingGuest.date === newGuest.date
              )
          ),
        ];
        const updatedGuestPassesUsed =
          guestData.guestPassesUsed + guests.length;

        let retryCount = 0;
        const maxRetries = 3;
        while (retryCount < maxRetries) {
          try {
            await updateMemberProfile(token, {
              customtext5: JSON.stringify(updatedGuestBookingIds),
            });
            await updateGuestData(
              token,
              updatedGuestPassesUsed,
              guestData.referralCodes,
              [],
              updatedGuests
            );
            break;
          } catch (error: any) {
            if (error.response?.status === 413 && retryCount < maxRetries - 1) {
              retryCount++;
              await new Promise((resolve) => setTimeout(resolve, 1000));
              continue;
            }
            throw error;
          }
        }
      }

      setBookings((prev) => {
        const exists = prev.find((b) => b.id === newId);
        if (exists) {
          return prev.map((b) =>
            b.id === newId
              ? {
                  ...booking,
                  id: newId,
                  time: displayTime,
                  date: formattedDate,
                }
              : b
          );
        }
        return [
          ...prev,
          { ...booking, id: newId, time: displayTime, date: formattedDate },
        ];
      });

      return newId;
    } catch (error) {
      console.error("Add booking error:", error);
      throw error;
    }
  };
  */

  /*
  db - guest pass include
  const addBooking = async (
    booking: Omit<Booking, "id">,
    token: string,
    serviceId: number,
    resourceId: number,
    membershipId: number,
    benefitId?: number
  ): Promise<number> => {
    try {
      const { date, time, servicename, guests, bay, location } = booking;
      const { hour, minute } = parseTimeSlot(time);
      const bookingstart = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}:00`;
      const duration = servicename.includes("1/2 hr") ? 30 : 60;
      const endHour = Math.floor((hour * 60 + minute + duration) / 60);
      const endMinute = (minute + duration) % 60;
      const bookingend = `${endHour.toString().padStart(2, "0")}:${endMinute
        .toString()
        .padStart(2, "0")}:00`;

      const bookingParams: Record<string, string> = {
        api_key: GYMMASTER_API_KEY || "",
        token,
        resourceid: resourceId.toString(),
        serviceid: serviceId.toString(),
        day: date,
        bookingstart,
        bookingend,
        roomid: "",
        equipmentid: "",
        membershipid: membershipId.toString(),
      };
      if (benefitId) {
        bookingParams.benefitid = benefitId.toString();
      }

      const response = await axios.post(
        "/api/gymmaster/v1/booking/servicebookings",
        new URLSearchParams(bookingParams),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error || "Booking failed");
      }

      let newId: number;
      if (
        !response.data.result?.bookingid &&
        response.data.result === "success"
      ) {
        const bookingsResponse = await axios.get(
          "/api/gymmaster/v2/member/bookings",
          {
            params: {
              api_key: GYMMASTER_API_KEY || "",
              token,
            },
          }
        );
        const latestBooking = bookingsResponse.data.result?.servicebookings
          ?.filter(
            (b: any) =>
              b.day === date &&
              b.starttime === bookingstart &&
              b.name.toUpperCase() === bay.toUpperCase()
          )
          .sort((a: any, b: any) => b.id - a.id)[0];

        if (!latestBooking) {
          throw new Error(
            `No matching booking found for date: ${date}, starttime: ${bookingstart}, bay: ${bay}`
          );
        }
        newId = Number(latestBooking.id);
      } else {
        newId = Number(response.data.result.bookingid);
      }
      if (!Number.isInteger(newId) || newId <= 0) {
        throw new Error(`Invalid booking ID: ${newId}`);
      }

      // Save to MongoDB via API route, including guests
      await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: newId,
          date,
          time: bookingstart,
          location,
          bay,
          servicename,
          userId: token,
          guests, // Include guests array
        }),
      });

      // Normalize time and date
      const [hourNum, minuteNum] = bookingstart.split(":").map(Number);
      const period = hourNum >= 12 ? "PM" : "AM";
      const displayHour =
        hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
      const displayTime = `${displayHour}:${minuteNum
        .toString()
        .padStart(2, "0")} ${period}`;
      const [year, month, day] = date.split("-").map(Number);
      const formattedDate = `${month.toString().padStart(2, "0")}/${day
        .toString()
        .padStart(2, "0")}/${year.toString().slice(-2)}`;

      // Update guest data (unchanged)
      if (guests.length > 0) {
        const guestData = await fetchGuestData(token);
        const updatedGuestBookingIds = [
          ...guestData.guestBookingIds,
          ...Array(guests.length).fill(newId),
        ].filter((id) => Number.isInteger(id) && id > 0);
        const updatedGuests = [
          ...guestData.guests,
          ...guests.filter(
            (newGuest) =>
              !guestData.guests.some(
                (existingGuest) =>
                  existingGuest.email === newGuest.email &&
                  existingGuest.name === newGuest.name &&
                  existingGuest.date === newGuest.date
              )
          ),
        ];
        const updatedGuestPassesUsed =
          guestData.guestPassesUsed + guests.length;

        let retryCount = 0;
        const maxRetries = 3;
        while (retryCount < maxRetries) {
          try {
            await updateMemberProfile(token, {
              customtext5: JSON.stringify(updatedGuestBookingIds),
            });
            await updateGuestData(
              token,
              updatedGuestPassesUsed,
              guestData.referralCodes,
              [],
              updatedGuests
            );
            break;
          } catch (error: any) {
            if (error.response?.status === 413 && retryCount < maxRetries - 1) {
              retryCount++;
              await new Promise((resolve) => setTimeout(resolve, 1000));
              continue;
            }
            console.warn("Guest data update failed:", error.message);
            break;
          }
        }
      }

      setBookings((prev) => {
        const exists = prev.find((b) => b.id === newId);
        if (exists) {
          return prev.map((b) =>
            b.id === newId
              ? {
                  ...booking,
                  id: newId,
                  time: displayTime,
                  date: formattedDate,
                }
              : b
          );
        }
        return [
          ...prev,
          { ...booking, id: newId, time: displayTime, date: formattedDate },
        ];
      });

      return newId;
    } catch (error) {
      console.error("Add booking error:", error);
      throw error;
    }
  };
  */

  /*
  const addBooking = async (
    booking: Omit<Booking, "id">,
    token: string,
    serviceId: number,
    resourceId: number,
    membershipId: number,
    benefitId?: number
  ): Promise<number> => {
    try {
      const {
        date,
        time,
        servicename,
        guests,
        bay,
        location,
        guestPassUsage,
        day,
      } = booking;
      const { hour, minute } = parseTimeSlot(time);
      const bookingstart = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}:00`;
      const duration = servicename.includes("1/2 hr") ? 30 : 60;
      const endHour = Math.floor((hour * 60 + minute + duration) / 60);
      const endMinute = (minute + duration) % 60;
      const bookingend = `${endHour.toString().padStart(2, "0")}:${endMinute
        .toString()
        .padStart(2, "0")}:00`;

      const bookingParams: Record<string, string> = {
        api_key: GYMMASTER_API_KEY || "",
        token,
        resourceid: resourceId.toString(),
        serviceid: serviceId.toString(),
        day: date,
        bookingstart,
        bookingend,
        roomid: "",
        equipmentid: "",
        membershipid: membershipId.toString(),
      };
      if (benefitId) {
        bookingParams.benefitid = benefitId.toString();
      }

      const response = await axios.post(
        "/api/gymmaster/v1/booking/servicebookings",
        new URLSearchParams(bookingParams),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error || "Booking failed");
      }

      let newId: number;
      if (
        !response.data.result?.bookingid &&
        response.data.result === "success"
      ) {
        const bookingsResponse = await axios.get(
          "/api/gymmaster/v2/member/bookings",
          {
            params: {
              api_key: GYMMASTER_API_KEY || "",
              token,
            },
          }
        );
        const latestBooking = bookingsResponse.data.result?.servicebookings
          ?.filter(
            (b: any) =>
              b.day === date &&
              b.starttime === bookingstart &&
              b.name.toUpperCase() === bay.toUpperCase()
          )
          .sort((a: any, b: any) => b.id - a.id)[0];

        if (!latestBooking) {
          throw new Error(
            `No matching booking found for date: ${date}, starttime: ${bookingstart}, bay: ${bay}`
          );
        }
        newId = Number(latestBooking.id);
      } else {
        newId = Number(response.data.result.bookingid);
      }
      if (!Number.isInteger(newId) || newId <= 0) {
        throw new Error(`Invalid booking ID: ${newId}`);
      }

      // Save to MongoDB via API route, including additional fields
      await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: newId,
          date,
          time: bookingstart,
          location,
          bay,
          servicename,
          userId: token,
          guests,
          guestPassUsage,
          day,
          starttime: bookingstart,
        }),
      });

      // Normalize time and date
      const [hourNum, minuteNum] = bookingstart.split(":").map(Number);
      const period = hourNum >= 12 ? "PM" : "AM";
      const displayHour =
        hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
      const displayTime = `${displayHour}:${minuteNum
        .toString()
        .padStart(2, "0")} ${period}`;
      const [year, month, dayNum] = date.split("-").map(Number);
      const formattedDate = `${month.toString().padStart(2, "0")}/${dayNum
        .toString()
        .padStart(2, "0")}/${year.toString().slice(-2)}`;

      // Update guest data (unchanged)
      if (guests.length > 0) {
        const guestData = await fetchGuestData(token);
        const updatedGuestBookingIds = [
          ...guestData.guestBookingIds,
          ...Array(guests.length).fill(newId),
        ].filter((id) => Number.isInteger(id) && id > 0);
        const updatedGuests = [
          ...guestData.guests,
          ...guests.filter(
            (newGuest) =>
              !guestData.guests.some(
                (existingGuest) =>
                  existingGuest.email === newGuest.email &&
                  existingGuest.name === newGuest.name &&
                  existingGuest.date === newGuest.date
              )
          ),
        ];
        const updatedGuestPassesUsed =
          guestData.guestPassesUsed + guests.length;

        let retryCount = 0;
        const maxRetries = 3;
        while (retryCount < maxRetries) {
          try {
            await updateMemberProfile(token, {
              customtext5: JSON.stringify(updatedGuestBookingIds),
            });
            await updateGuestData(
              token,
              updatedGuestPassesUsed,
              guestData.referralCodes,
              [],
              updatedGuests
            );
            break;
          } catch (error: any) {
            if (error.response?.status === 413 && retryCount < maxRetries - 1) {
              retryCount++;
              await new Promise((resolve) => setTimeout(resolve, 1000));
              continue;
            }
            console.warn("Guest data update failed:", error.message);
            break;
          }
        }
      }

      setBookings((prev) => {
        const exists = prev.find((b) => b.id === newId);
        if (exists) {
          return prev.map((b) =>
            b.id === newId
              ? {
                  ...booking,
                  id: newId,
                  time: displayTime,
                  date: formattedDate,
                }
              : b
          );
        }
        return [
          ...prev,
          { ...booking, id: newId, time: displayTime, date: formattedDate },
        ];
      });

      return newId;
    } catch (error) {
      console.error("Add booking error:", error);
      throw error;
    }
  };
  */

  /*
  const addBooking = async (
    booking: Omit<Booking, "id">,
    token: string,
    serviceId: number,
    resourceId: number,
    membershipId: number,
    benefitId?: number
  ): Promise<number> => {
    try {
      const { date, time, servicename, guests, bay, location, day } = booking;
      const { hour, minute } = parseTimeSlot(time);
      const bookingstart = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}:00`;
      const duration = servicename.includes("1/2 hr") ? 30 : 60;
      const endHour = Math.floor((hour * 60 + minute + duration) / 60);
      const endMinute = (minute + duration) % 60;
      const bookingend = `${endHour.toString().padStart(2, "0")}:${endMinute
        .toString()
        .padStart(2, "0")}:00`;

      // Fetch guest data to get current guest passes used
      const guestData = await fetchGuestData(token);
      const guestPassesUsed = guestData.guestPassesUsed || 0;
      const freeGuestPassesPerMonth = 3;

      // Calculate guest pass usage
      const freePassesAvailable = Math.max(
        freeGuestPassesPerMonth - guestPassesUsed,
        0
      );
      const guestPassUsage = {
        free: Math.min(guests.length, freePassesAvailable),
        charged: Math.max(guests.length - freePassesAvailable, 0),
      };

      const bookingParams: Record<string, string> = {
        api_key: GYMMASTER_API_KEY || "",
        token,
        resourceid: resourceId.toString(),
        serviceid: serviceId.toString(),
        day: date,
        bookingstart,
        bookingend,
        roomid: "",
        equipmentid: "",
        membershipid: membershipId.toString(),
      };
      if (benefitId) {
        bookingParams.benefitid = benefitId.toString();
      }

      const response = await axios.post(
        "/api/gymmaster/v1/booking/servicebookings",
        new URLSearchParams(bookingParams),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error || "Booking failed");
      }

      let newId: number;
      if (
        !response.data.result?.bookingid &&
        response.data.result === "success"
      ) {
        const bookingsResponse = await axios.get(
          "/api/gymmaster/v2/member/bookings",
          {
            params: {
              api_key: GYMMASTER_API_KEY || "",
              token,
            },
          }
        );
        const latestBooking = bookingsResponse.data.result?.servicebookings
          ?.filter(
            (b: any) =>
              b.day === date &&
              b.starttime === bookingstart &&
              b.name.toUpperCase() === bay.toUpperCase()
          )
          .sort((a: any, b: any) => b.id - a.id)[0];

        if (!latestBooking) {
          throw new Error(
            `No matching booking found for date: ${date}, starttime: ${bookingstart}, bay: ${bay}`
          );
        }
        newId = Number(latestBooking.id);
      } else {
        newId = Number(response.data.result.bookingid);
      }
      if (!Number.isInteger(newId) || newId <= 0) {
        throw new Error(`Invalid booking ID: ${newId}`);
      }

      // Save to MongoDB via API route
      await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: newId,
          date,
          time: bookingstart,
          location,
          bay,
          servicename,
          userId: token,
          guests,
          guestPassUsage,
          day,
          starttime: bookingstart,
        }),
      });

      // Normalize time and date
      const [hourNum, minuteNum] = bookingstart.split(":").map(Number);
      const period = hourNum >= 12 ? "PM" : "AM";
      const displayHour =
        hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
      const displayTime = `${displayHour}:${minuteNum
        .toString()
        .padStart(2, "0")} ${period}`;
      const [year, month, dayNum] = date.split("-").map(Number);
      const formattedDate = `${month.toString().padStart(2, "0")}/${dayNum
        .toString()
        .padStart(2, "0")}/${year.toString().slice(-2)}`;

      // Update guest data in GymMaster (only increment for free passes)
      if (guests.length > 0) {
        const updatedGuestBookingIds = [
          ...guestData.guestBookingIds,
          ...Array(guests.length).fill(newId),
        ].filter((id) => Number.isInteger(id) && id > 0);
        const updatedGuests = [
          ...guestData.guests,
          ...guests.filter(
            (newGuest) =>
              !guestData.guests.some(
                (existingGuest) =>
                  existingGuest.email === newGuest.email &&
                  existingGuest.name === newGuest.name &&
                  existingGuest.date === newGuest.date
              )
          ),
        ];
        const updatedGuestPassesUsed = guestPassesUsed + guestPassUsage.free; // Only increment free passes

        let retryCount = 0;
        const maxRetries = 3;
        while (retryCount < maxRetries) {
          try {
            await updateMemberProfile(token, {
              customtext5: JSON.stringify(updatedGuestBookingIds),
            });
            await updateGuestData(
              token,
              updatedGuestPassesUsed,
              guestData.referralCodes,
              [],
              updatedGuests
            );
            break;
          } catch (error: any) {
            if (error.response?.status === 413 && retryCount < maxRetries - 1) {
              retryCount++;
              await new Promise((resolve) => setTimeout(resolve, 1000));
              continue;
            }
            console.warn("Guest data update failed:", error.message);
            break;
          }
        }
      }

      setBookings((prev) => {
        const exists = prev.find((b) => b.id === newId);
        if (exists) {
          return prev.map((b) =>
            b.id === newId
              ? {
                  ...booking,
                  id: newId,
                  time: displayTime,
                  date: formattedDate,
                  guestPassUsage,
                }
              : b
          );
        }
        return [
          ...prev,
          {
            ...booking,
            id: newId,
            time: displayTime,
            date: formattedDate,
            guestPassUsage,
          },
        ];
      });

      return newId;
    } catch (error) {
      console.error("Add booking error:", error);
      throw error;
    }
  };
  */

  const addBooking = async (
    booking: Omit<Booking, "id">,
    token: string,
    serviceId: number,
    resourceId: number,
    membershipId: number,
    benefitId?: number
  ): Promise<number> => {
    try {
      const {
        date,
        time,
        servicename,
        guests,
        bay,
        location,
        day,
        // starttime,
        referralCodes,
      } = booking;
      const { hour, minute } = parseTimeSlot(time);
      const bookingstart = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}:00`;
      const duration = servicename.includes("1/2 hr") ? 30 : 60;
      const endHour = Math.floor((hour * 60 + minute + duration) / 60);
      const endMinute = (minute + duration) % 60;
      const bookingend = `${endHour.toString().padStart(2, "0")}:${endMinute
        .toString()
        .padStart(2, "0")}:00`;

      // Fetch guest data
      const guestData = await fetchGuestData(token);
      const guestPassesUsed = guestData.guestPassesUsed || 0;
      const freeGuestPassesPerMonth =
        Number(process.env.NEXT_PUBLIC_FREE_GUEST_PASSES_PER_MONTH) || 3;
      const freePassesAvailable = Math.max(
        freeGuestPassesPerMonth - guestPassesUsed,
        0
      );
      const guestPassUsage = {
        free: Math.min(guests.length, freePassesAvailable),
        charged: Math.max(guests.length - freePassesAvailable, 0),
      };

      const bookingParams: Record<string, string> = {
        api_key: GYMMASTER_API_KEY || "",
        token,
        resourceid: resourceId.toString(),
        serviceid: serviceId.toString(),
        day: date,
        bookingstart,
        bookingend,
        roomid: "",
        equipmentid: "",
        membershipid: membershipId.toString(),
      };
      if (benefitId) {
        bookingParams.benefitid = benefitId.toString();
      }

      const response = await axios.post(
        "/api/gymmaster/v1/booking/servicebookings",
        new URLSearchParams(bookingParams),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error || "Booking failed");
      }

      let newId: number;
      if (
        !response.data.result?.bookingid &&
        response.data.result === "success"
      ) {
        const bookingsResponse = await axios.get(
          "/api/gymmaster/v2/member/bookings",
          {
            params: {
              api_key: GYMMASTER_API_KEY || "",
              token,
            },
          }
        );
        const latestBooking = bookingsResponse.data.result?.servicebookings
          ?.filter(
            (b: any) =>
              b.day === date &&
              b.starttime === bookingstart &&
              b.name.toUpperCase() === bay.toUpperCase()
          )
          .sort((a: any, b: any) => b.id - a.id)[0];

        if (!latestBooking) {
          throw new Error(
            `No matching booking found for date: ${date}, starttime: ${bookingstart}, bay: ${bay}`
          );
        }
        newId = Number(latestBooking.id);
      } else {
        newId = Number(response.data.result.bookingid);
      }
      if (!Number.isInteger(newId) || newId <= 0) {
        throw new Error(`Invalid booking ID: ${newId}`);
      }

      // Save to MongoDB
      await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: newId,
          date,
          time: bookingstart,
          location,
          bay,
          servicename,
          userId: token,
          guests,
          guestPassUsage,
          day,
          starttime: bookingstart,
          referralCodes: referralCodes || [], // Pass referral codes
        }),
      });

      // Normalize time and date
      const [hourNum, minuteNum] = bookingstart.split(":").map(Number);
      const period = hourNum >= 12 ? "PM" : "AM";
      const displayHour =
        hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
      const displayTime = `${displayHour}:${minuteNum
        .toString()
        .padStart(2, "0")} ${period}`;
      const [year, month, dayNum] = date.split("-").map(Number);
      const formattedDate = `${month.toString().padStart(2, "0")}/${dayNum
        .toString()
        .padStart(2, "0")}/${year.toString().slice(-2)}`;

      // Update guest data in GymMaster
      if (guests.length > 0) {
        const updatedGuestBookingIds = [
          ...guestData.guestBookingIds,
          ...Array(guests.length).fill(newId),
        ].filter((id) => Number.isInteger(id) && id > 0);
        const updatedGuests = [
          ...guestData.guests,
          ...guests.filter(
            (newGuest) =>
              !guestData.guests.some(
                (existingGuest) =>
                  existingGuest.email === newGuest.email &&
                  existingGuest.name === newGuest.name &&
                  existingGuest.date === newGuest.date
              )
          ),
        ];
        const updatedGuestPassesUsed = guestPassesUsed + guestPassUsage.free;

        let retryCount = 0;
        const maxRetries = 3;
        while (retryCount < maxRetries) {
          try {
            await updateMemberProfile(token, {
              customtext5: JSON.stringify(updatedGuestBookingIds),
            });
            await updateGuestData(
              token,
              updatedGuestPassesUsed,
              referralCodes || guestData.referralCodes, // Use provided referralCodes
              [],
              updatedGuests
            );
            break;
          } catch (error: any) {
            if (error.response?.status === 413 && retryCount < maxRetries - 1) {
              retryCount++;
              await new Promise((resolve) => setTimeout(resolve, 1000));
              continue;
            }
            console.warn("Guest data update failed:", error.message);
            break;
          }
        }
      }

      setBookings((prev) => {
        const exists = prev.find((b) => b.id === newId);
        if (exists) {
          return prev.map((b) =>
            b.id === newId
              ? {
                  ...booking,
                  id: newId,
                  time: displayTime,
                  date: formattedDate,
                  guestPassUsage,
                }
              : b
          );
        }
        return [
          ...prev,
          {
            ...booking,
            id: newId,
            time: displayTime,
            date: formattedDate,
            guestPassUsage,
          },
        ];
      });

      return newId;
    } catch (error) {
      console.error("Add booking error:", error);
      throw error;
    }
  };

  /*
  no db
  const deleteBooking = async (id: number, token: string): Promise<void> => {
    try {
      // Cancel booking via GymMaster API
      const response = await axios.post(
        "/api/gymmaster/v1/member/cancelbooking",
        new URLSearchParams({
          api_key: GYMMASTER_API_KEY || "",
          token,
          bookingid: id.toString(),
          waitlist: "0",
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error || "Failed to cancel booking");
      }
      console.log("Cancellation confirmed via API for booking ID:", id);

      // Update customtext5 to remove the booking ID
      const guestData = await fetchGuestData(token);
      const updatedGuestBookingIds = guestData.guestBookingIds.filter(
        (bookingId) => bookingId !== id
      );
      let retryCount = 0;
      const maxRetries = 3;
      while (retryCount < maxRetries) {
        try {
          await updateMemberProfile(token, {
            customtext5: JSON.stringify(updatedGuestBookingIds),
          });
          break;
        } catch (error: any) {
          if (error.response?.status === 413 && retryCount < maxRetries - 1) {
            console.warn(`Retry ${retryCount + 1} due to 413 error`);
            retryCount++;
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }
          throw error;
        }
      }

      // Remove from local state
      setBookings((prev) => prev.filter((booking) => booking.id !== id));
    } catch (error) {
      console.error("Delete booking error:", error);
      setBookings((prev) => prev.filter((booking) => booking.id !== id));
      throw new Error("Failed to delete booking");
    }
  };
  */

  /*
  no db
  const deleteBooking = async (id: number, token: string): Promise<void> => {
    try {
      const response = await axios.post(
        "/api/gymmaster/v1/member/cancelbooking",
        new URLSearchParams({
          api_key: GYMMASTER_API_KEY || "",
          token,
          bookingid: id.toString(),
          waitlist: "0",
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error || "Failed to cancel booking");
      }

      // Delete from MongoDB via API route
      await fetch("/api/bookings/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id }),
      });

      // Update guest data
      const guestData = await fetchGuestData(token);
      const updatedGuestBookingIds = guestData.guestBookingIds.filter(
        (bookingId) => bookingId !== id
      );
      let retryCount = 0;
      const maxRetries = 3;
      while (retryCount < maxRetries) {
        try {
          await updateMemberProfile(token, {
            customtext5: JSON.stringify(updatedGuestBookingIds),
          });
          break;
        } catch (error: any) {
          if (error.response?.status === 413 && retryCount < maxRetries - 1) {
            retryCount++;
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }
          throw error;
        }
      }

      setBookings((prev) => prev.filter((booking) => booking.id !== id));
    } catch (error) {
      console.error("Delete booking error:", error);
      throw error;
    }
  };
  */

  /*
  db - no guest
  const deleteBooking = async (id: number, token: string): Promise<void> => {
    try {
      // Cancel booking via GymMaster API
      const gymMasterResponse = await axios.post(
        "/api/gymmaster/v1/member/cancelbooking",
        new URLSearchParams({
          api_key: GYMMASTER_API_KEY || "",
          token,
          bookingid: id.toString(),
          waitlist: "0",
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      if (gymMasterResponse.data.error) {
        throw new Error(
          gymMasterResponse.data.error ||
            "Failed to cancel booking via GymMaster API"
        );
      }

      // Delete from MongoDB via API route
      const mongoDeleteResponse = await fetch("/api/bookings/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id }),
      });
      if (!mongoDeleteResponse.ok) {
        throw new Error("Failed to delete booking from MongoDB");
      }

      // Update guest data (non-critical, continue on failure)
      try {
        const guestData = await fetchGuestData(token);
        const updatedGuestBookingIds = guestData.guestBookingIds.filter(
          (bookingId) => bookingId !== id
        );
        let retryCount = 0;
        const maxRetries = 3;
        while (retryCount < maxRetries) {
          try {
            await updateMemberProfile(token, {
              customtext5: JSON.stringify(updatedGuestBookingIds),
            });
            break;
          } catch (error: any) {
            if (error.response?.status === 413 && retryCount < maxRetries - 1) {
              retryCount++;
              await new Promise((resolve) => setTimeout(resolve, 1000));
              continue;
            }
            console.warn("Guest data update failed:", error.message);
            break;
          }
        }
      } catch (error) {
        console.warn("Non-critical error updating guest data:", error);
      }

      // Fetch updated bookings from GymMaster API
      let gymMasterBookings: any[] = [];
      try {
        const bookingsResponse = await axios.get(
          "/api/gymmaster/v2/member/bookings",
          {
            params: {
              api_key: GYMMASTER_API_KEY || "",
              token,
            },
          }
        );
        gymMasterBookings = bookingsResponse.data.result?.servicebookings || [];
      } catch (error) {
        console.warn("Failed to fetch GymMaster bookings:", error);
      }

      // Fetch bookings from MongoDB
      let mongoBookings: Booking[] = [];
      try {
        const mongoFetchResponse = await fetch("/api/bookings/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: token }),
        });
        if (!mongoFetchResponse.ok) {
          throw new Error("Failed to fetch bookings from MongoDB");
        }
        const { bookings } = await mongoFetchResponse.json();
        mongoBookings = bookings;
      } catch (error) {
        console.warn("Failed to fetch MongoDB bookings:", error);
      }

      // Merge and normalize bookings (only include bookings present in both sources)
      const updatedBookings = gymMasterBookings
        .filter((b: any) =>
          mongoBookings.some((mb: Booking) => mb.id === Number(b.id))
        )
        .map((b: any) => {
          const [hourNum, minuteNum] = b.starttime.split(":").map(Number);
          const period = hourNum >= 12 ? "PM" : "AM";
          const displayHour =
            hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
          const displayTime = `${displayHour}:${minuteNum
            .toString()
            .padStart(2, "0")} ${period}`;
          const [year, month, day] = b.day.split("-").map(Number);
          const formattedDate = `${month.toString().padStart(2, "0")}/${day
            .toString()
            .padStart(2, "0")}/${year.toString().slice(-2)}`;
          const mongoBooking = mongoBookings.find(
            (mb: Booking) => mb.id === Number(b.id)
          );
          return {
            id: Number(b.id),
            date: formattedDate,
            time: displayTime,
            location: b.location || mongoBooking?.location || "",
            bay: b.name,
            servicename: b.servicename,
            guests: [],
            guestPassUsage: { free: 0, charged: 0 },
            day: new Date(b.day).toLocaleDateString("en-US", {
              weekday: "long",
            }),
            starttime: b.starttime,
          };
        });

      // Update state with merged bookings
      setBookings(updatedBookings);
    } catch (error) {
      console.error("Delete booking error:", error);
      // Fallback: Remove locally to keep UI consistent
      setBookings((prev) => prev.filter((booking) => booking.id !== id));
      throw new Error(`Failed to delete booking: ${error.message}`);
    }
  };
  */

  /*
  const deleteBooking = async (id: number, token: string): Promise<void> => {
    try {
      // Cancel booking via GymMaster API
      const gymMasterResponse = await axios.post(
        "/api/gymmaster/v1/member/cancelbooking",
        new URLSearchParams({
          api_key: GYMMASTER_API_KEY || "",
          token,
          bookingid: id.toString(),
          waitlist: "0",
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      if (gymMasterResponse.data.error) {
        throw new Error(
          gymMasterResponse.data.error ||
            "Failed to cancel booking via GymMaster API"
        );
      }

      // Delete from MongoDB via API route
      const mongoDeleteResponse = await fetch("/api/bookings/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id }),
      });
      if (!mongoDeleteResponse.ok) {
        throw new Error("Failed to delete booking from MongoDB");
      }

      // Update guest data (non-critical, continue on failure)
      try {
        const guestData = await fetchGuestData(token);
        const updatedGuestBookingIds = guestData.guestBookingIds.filter(
          (bookingId) => bookingId !== id
        );
        let retryCount = 0;
        const maxRetries = 3;
        while (retryCount < maxRetries) {
          try {
            await updateMemberProfile(token, {
              customtext5: JSON.stringify(updatedGuestBookingIds),
            });
            break;
          } catch (error: any) {
            if (error.response?.status === 413 && retryCount < maxRetries - 1) {
              retryCount++;
              await new Promise((resolve) => setTimeout(resolve, 1000));
              continue;
            }
            console.warn("Guest data update failed:", error.message);
            break;
          }
        }
      } catch (error) {
        console.warn("Non-critical error updating guest data:", error);
      }

      // Fetch updated bookings from GymMaster API
      let gymMasterBookings: any[] = [];
      try {
        const bookingsResponse = await axios.get(
          "/api/gymmaster/v2/member/bookings",
          {
            params: {
              api_key: GYMMASTER_API_KEY || "",
              token,
            },
          }
        );
        gymMasterBookings = bookingsResponse.data.result?.servicebookings || [];
      } catch (error) {
        console.warn("Failed to fetch GymMaster bookings:", error);
      }

      // Fetch bookings from MongoDB
      let mongoBookings: Booking[] = [];
      try {
        const mongoFetchResponse = await fetch("/api/bookings/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: token }),
        });
        if (!mongoFetchResponse.ok) {
          throw new Error("Failed to fetch bookings from MongoDB");
        }
        const { bookings } = await mongoFetchResponse.json();
        mongoBookings = bookings;
      } catch (error) {
        console.warn("Failed to fetch MongoDB bookings:", error);
      }

      // Merge and normalize bookings
      const updatedBookings = gymMasterBookings
        .filter((b: any) =>
          mongoBookings.some((mb: Booking) => mb.id === Number(b.id))
        )
        .map((b: any) => {
          const [hourNum, minuteNum] = b.starttime.split(":").map(Number);
          const period = hourNum >= 12 ? "PM" : "AM";
          const displayHour =
            hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
          const displayTime = `${displayHour}:${minuteNum
            .toString()
            .padStart(2, "0")} ${period}`;
          const [year, month, day] = b.day.split("-").map(Number);
          const formattedDate = `${month.toString().padStart(2, "0")}/${day
            .toString()
            .padStart(2, "0")}/${year.toString().slice(-2)}`;
          const mongoBooking = mongoBookings.find(
            (mb: Booking) => mb.id === Number(b.id)
          );
          return {
            id: Number(b.id),
            date: formattedDate,
            time: displayTime,
            location: b.location || mongoBooking?.location || "",
            bay: b.name,
            servicename: b.servicename,
            guests: mongoBooking?.guests || [], // Include guests from MongoDB
            guestPassUsage: { free: 0, charged: 0 },
            day: new Date(b.day).toLocaleDateString("en-US", {
              weekday: "long",
            }),
            starttime: b.starttime,
          };
        });

      // Update state with merged bookings
      setBookings(updatedBookings);
    } catch (error) {
      console.error("Delete booking error:", error);
      setBookings((prev) => prev.filter((booking) => booking.id !== id));
      throw new Error(`Failed to delete booking: ${error.message}`);
    }
  };
  */

  /*
  const deleteBooking = async (id: number, token: string): Promise<void> => {
    try {
      // Cancel booking via GymMaster API
      const gymMasterResponse = await axios.post(
        "/api/gymmaster/v1/member/cancelbooking",
        new URLSearchParams({
          api_key: GYMMASTER_API_KEY || "",
          token,
          bookingid: id.toString(),
          waitlist: "0",
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      if (gymMasterResponse.data.error) {
        throw new Error(
          gymMasterResponse.data.error ||
            "Failed to cancel booking via GymMaster API"
        );
      }

      // Delete from MongoDB via API route
      const mongoDeleteResponse = await fetch("/api/bookings/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id }),
      });
      if (!mongoDeleteResponse.ok) {
        throw new Error("Failed to delete booking from MongoDB");
      }

      // Update guest data (non-critical, continue on failure)
      try {
        const guestData = await fetchGuestData(token);
        const updatedGuestBookingIds = guestData.guestBookingIds.filter(
          (bookingId) => bookingId !== id
        );
        let retryCount = 0;
        const maxRetries = 3;
        while (retryCount < maxRetries) {
          try {
            await updateMemberProfile(token, {
              customtext5: JSON.stringify(updatedGuestBookingIds),
            });
            break;
          } catch (error: any) {
            if (error.response?.status === 413 && retryCount < maxRetries - 1) {
              retryCount++;
              await new Promise((resolve) => setTimeout(resolve, 1000));
              continue;
            }
            console.warn("Guest data update failed:", error.message);
            break;
          }
        }
      } catch (error) {
        console.warn("Non-critical error updating guest data:", error);
      }

      // Fetch updated bookings from GymMaster API
      let gymMasterBookings: any[] = [];
      try {
        const bookingsResponse = await axios.get(
          "/api/gymmaster/v2/member/bookings",
          {
            params: {
              api_key: GYMMASTER_API_KEY || "",
              token,
            },
          }
        );
        gymMasterBookings = bookingsResponse.data.result?.servicebookings || [];
      } catch (error) {
        console.warn("Failed to fetch GymMaster bookings:", error);
      }

      // Fetch bookings from MongoDB
      let mongoBookings: Booking[] = [];
      try {
        const mongoFetchResponse = await fetch("/api/bookings/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: token }),
        });
        if (!mongoFetchResponse.ok) {
          throw new Error("Failed to fetch bookings from MongoDB");
        }
        const { bookings } = await mongoFetchResponse.json();
        mongoBookings = bookings;
      } catch (error) {
        console.warn("Failed to fetch MongoDB bookings:", error);
      }

      // Merge and normalize bookings
      const updatedBookings = gymMasterBookings
        .filter((b: any) =>
          mongoBookings.some((mb: Booking) => mb.id === Number(b.id))
        )
        .map((b: any) => {
          const [hourNum, minuteNum] = b.starttime.split(":").map(Number);
          const period = hourNum >= 12 ? "PM" : "AM";
          const displayHour =
            hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
          const displayTime = `${displayHour}:${minuteNum
            .toString()
            .padStart(2, "0")} ${period}`;
          const [year, month, day] = b.day.split("-").map(Number);
          const formattedDate = `${month.toString().padStart(2, "0")}/${day
            .toString()
            .padStart(2, "0")}/${year.toString().slice(-2)}`;
          const mongoBooking = mongoBookings.find(
            (mb: Booking) => mb.id === Number(b.id)
          );
          return {
            id: Number(b.id),
            date: formattedDate,
            time: displayTime,
            location: b.location || mongoBooking?.location || "",
            bay: b.name,
            servicename: b.servicename,
            guests: mongoBooking?.guests || [],
            guestPassUsage: mongoBooking?.guestPassUsage || {
              free: 0,
              charged: 0,
            },
            day:
              mongoBooking?.day ||
              new Date(b.day).toLocaleDateString("en-US", { weekday: "long" }),
            starttime: b.starttime,
          };
        });

      // Update state with merged bookings
      setBookings(updatedBookings);
    } catch (error) {
      console.error("Delete booking error:", error);
      setBookings((prev) => prev.filter((booking) => booking.id !== id));
      throw new Error(`Failed to delete booking: ${error.message}`);
    }
  };
  */

  const deleteBooking = async (id: number, token: string): Promise<void> => {
    try {
      // Cancel booking via GymMaster API
      const gymMasterResponse = await axios.post(
        "/api/gymmaster/v1/member/cancelbooking",
        new URLSearchParams({
          api_key: GYMMASTER_API_KEY || "",
          token,
          bookingid: id.toString(),
          waitlist: "0",
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      if (gymMasterResponse.data.error) {
        throw new Error(
          gymMasterResponse.data.error ||
            "Failed to cancel booking via GymMaster API"
        );
      }

      // Delete from MongoDB
      const mongoDeleteResponse = await fetch("/api/bookings/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id }),
      });
      if (!mongoDeleteResponse.ok) {
        throw new Error("Failed to delete booking from MongoDB");
      }

      // Update guest data
      try {
        const guestData = await fetchGuestData(token);
        const updatedGuestBookingIds = guestData.guestBookingIds.filter(
          (bookingId) => bookingId !== id
        );
        let retryCount = 0;
        const maxRetries = 3;
        while (retryCount < maxRetries) {
          try {
            await updateMemberProfile(token, {
              customtext5: JSON.stringify(updatedGuestBookingIds),
            });
            break;
          } catch (error: any) {
            if (error.response?.status === 413 && retryCount < maxRetries - 1) {
              retryCount++;
              await new Promise((resolve) => setTimeout(resolve, 1000));
              continue;
            }
            console.warn("Guest data update failed:", error.message);
            break;
          }
        }
      } catch (error) {
        console.warn("Non-critical error updating guest data:", error);
      }

      // Fetch updated bookings from GymMaster
      let gymMasterBookings: any[] = [];
      try {
        const bookingsResponse = await axios.get(
          "/api/gymmaster/v2/member/bookings",
          {
            params: {
              api_key: GYMMASTER_API_KEY || "",
              token,
            },
          }
        );
        gymMasterBookings = bookingsResponse.data.result?.servicebookings || [];
      } catch (error) {
        console.warn("Failed to fetch GymMaster bookings:", error);
      }

      // Fetch bookings from MongoDB
      let mongoBookings: Booking[] = [];
      try {
        const mongoFetchResponse = await fetch("/api/bookings/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: token }),
        });
        if (!mongoFetchResponse.ok) {
          throw new Error("Failed to fetch bookings from MongoDB");
        }
        const { bookings } = await mongoFetchResponse.json();
        mongoBookings = bookings;
      } catch (error) {
        console.warn("Failed to fetch MongoDB bookings:", error);
      }

      // Merge and normalize bookings
      const updatedBookings = gymMasterBookings
        .filter((b: any) =>
          mongoBookings.some((mb: Booking) => mb.id === Number(b.id))
        )
        .map((b: any) => {
          const [hourNum, minuteNum] = b.starttime.split(":").map(Number);
          const period = hourNum >= 12 ? "PM" : "AM";
          const displayHour =
            hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
          const displayTime = `${displayHour}:${minuteNum
            .toString()
            .padStart(2, "0")} ${period}`;
          const [year, month, day] = b.day.split("-").map(Number);
          const formattedDate = `${month.toString().padStart(2, "0")}/${day
            .toString()
            .padStart(2, "0")}/${year.toString().slice(-2)}`;
          const mongoBooking = mongoBookings.find(
            (mb: Booking) => mb.id === Number(b.id)
          );
          return {
            id: Number(b.id),
            date: formattedDate,
            time: displayTime,
            location: b.location || mongoBooking?.location || "",
            bay: b.name,
            servicename: b.servicename,
            guests: mongoBooking?.guests || [],
            guestPassUsage: mongoBooking?.guestPassUsage || {
              free: 0,
              charged: 0,
            },
            day:
              mongoBooking?.day ||
              new Date(b.day).toLocaleDateString("en-US", { weekday: "long" }),
            starttime: b.starttime,
            referralCodes: mongoBooking?.referralCodes || [],
          };
        });

      // Update state
      setBookings(updatedBookings);
    } catch (error) {
      console.error("Delete booking error:", error);
      setBookings((prev) => prev.filter((booking) => booking.id !== id));
      throw new Error(`Failed to delete booking: ${error.message}`);
    }
  };

  const updateBooking = (id: number, updatedBooking: Partial<Booking>) => {
    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === id ? { ...booking, ...updatedBooking } : booking
      )
    );
  };

  const parseTimeSlot = (time: string) => {
    const [hourMinute, period] = time.split(" ");
    let hour = Number(hourMinute.split(":")[0]);
    const minute = Number(hourMinute.split(":")[1]);
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    return { hour, minute };
  };

  return (
    <BookingContext.Provider
      value={{
        bookings,
        addBooking,
        deleteBooking,
        updateBooking,
        setBookings,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBookings = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBookings must be used within a BookingProvider");
  }
  return context;
};
