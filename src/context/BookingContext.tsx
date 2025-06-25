"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import axios from "axios";
import { fetchGuestData, updateGuestData } from "@/api/gymmaster";

export interface Booking {
  id?: number;
  date: string;
  time: string;
  location: string;
  bay: string;
  servicename: string;
  guests: { name: string; email: string; date?: string }[];
  guestPassUsage: { free: number; charged: number };
  day: string;
  starttime: string;
}

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
  deleteBooking: (id: number) => void;
  updateBooking: (id: number, updatedBooking: Partial<Booking>) => void;
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

const GYMMASTER_API_KEY = process.env.NEXT_PUBLIC_GYMMASTER_API_KEY;

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);

  const addBooking = async (
    booking: Omit<Booking, "id">,
    token: string,
    serviceId: number,
    resourceId: number,
    membershipId: number,
    benefitId?: number
  ): Promise<number> => {
    try {
      const { date, time, servicename, guests } = booking;
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

      if (response.data.error || !response.data.result) {
        throw new Error(response.data.error || "Booking failed");
      }

      const newId = response.data.result.bookingid;

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

      // Update guest data
      if (guests.length > 0) {
        const guestData = await fetchGuestData(token);
        const updatedGuestBookingIds = [
          ...guestData.guestBookingIds,
          ...Array(guests.length).fill(newId),
        ];
        const updatedGuests = [...(guestData.guests || []), ...guests];
        const updatedGuestPassesUsed =
          guestData.guestPassesUsed + guests.length;
        await updateGuestData(
          token,
          updatedGuestPassesUsed,
          guestData.referralCodes,
          updatedGuestBookingIds,
          updatedGuests
        );
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

  const deleteBooking = (id: number) => {
    setBookings((prev) => prev.filter((booking) => booking.id !== id));
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
