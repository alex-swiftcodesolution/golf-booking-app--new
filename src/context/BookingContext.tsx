"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import axios from "axios";
import { fetchGuestData, updateGuestData } from "@/api/gymmaster";

export interface Booking {
  id: number;
  date: string;
  time: string;
  location: string;
  bay: string;
  servicename: string;
  guests: { name: string; email: string }[];
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
  setBookings: (bookings: Booking[]) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

const GYMMASTER_API_KEY = process.env.NEXT_PUBLIC_GYMMASTER_API_KEY;

// Interface for GymMaster service booking response
interface ServiceBooking {
  id: number;
  day: string;
  starttime: string;
  start_str?: string;
  location?: string;
  name?: string;
  servicename?: string;
}

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          console.log("No token, skipping fetch");
          return;
        }

        const [bookingsRes, guestData] = await Promise.all([
          axios.get("/api/gymmaster/v2/member/bookings", {
            params: {
              api_key: GYMMASTER_API_KEY,
              token,
            },
          }),
          fetchGuestData(token),
        ]);

        console.log("Bookings Response:", bookingsRes.data);
        console.log("Guest Data:", guestData);

        const { guestBookingIds, guests } = guestData;

        // Map guest data to bookings
        const guestMap: Record<number, { name: string; email: string }[]> = {};
        let guestIndex = 0;
        guestBookingIds.forEach((id: number) => {
          guestMap[id] = guestMap[id] || [];
          if (guestIndex < guests.length) {
            guestMap[id].push(guests[guestIndex]);
            guestIndex++;
          } else {
            guestMap[id].push({
              name: `Guest ${guestIndex + 1}`,
              email: `guest${guestIndex + 1}@example.com`,
            });
          }
        });
        console.log("Guest Map:", guestMap);

        const fetchedBookings =
          bookingsRes.data.result?.servicebookings?.map((b: ServiceBooking) => {
            let time = b.starttime.slice(0, 5);
            if (b.start_str) {
              const [hours, minutes, period] = b.start_str
                .match(/(\d+):(\d+)\s*(am|pm)/i)
                ?.slice(1) || ["0", "00", "am"];
              let hourNum = parseInt(hours);
              if (period.toLowerCase() === "pm" && hourNum !== 12)
                hourNum += 12;
              if (period.toLowerCase() === "am" && hourNum === 12) hourNum = 0;
              time = `${hourNum.toString().padStart(2, "0")}:${minutes}`;
            }

            const bookingGuests = guestMap[b.id] || [];
            return {
              id: b.id,
              date: b.day,
              time,
              location: b.location || "Simcoquitos 24/7 Golf Club",
              bay: b.name || "Unknown",
              servicename: b.servicename || "Golf Simulator",
              guests: bookingGuests,
              guestPassUsage: {
                free: bookingGuests.length
                  ? Math.min(bookingGuests.length, 2)
                  : 0,
                charged: bookingGuests.length
                  ? Math.max(bookingGuests.length - 2, 0)
                  : 0,
              },
              day: new Date(b.day).toLocaleDateString("en-US", {
                weekday: "long",
              }),
              starttime: time,
            };
          }) || [];

        console.log("Mapped Bookings:", fetchedBookings);

        // Merge with existing bookings to preserve new bookings
        setBookings((prev) => {
          const merged = [...prev];
          fetchedBookings.forEach((newBooking: Booking) => {
            const index = merged.findIndex((b) => b.id === newBooking.id);
            if (index >= 0) {
              merged[index] = { ...merged[index], ...newBooking };
            } else {
              merged.push(newBooking);
            }
          });
          return merged;
        });
      } catch (err) {
        console.error("Failed to fetch bookings:", err);
        setBookings([]);
      }
    };

    fetchBookings();
  }, []);

  const addBooking = async (
    booking: Omit<Booking, "id">,
    token: string,
    serviceId: number,
    resourceId: number,
    membershipId: number,
    benefitId?: number
  ): Promise<number> => {
    try {
      const { date, time, location, guests } = booking;
      const { hour, minute } = parseTimeSlot(time);
      const bookingstart = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}:00`;
      const duration = location.includes("1/2 hr") ? 30 : 60;
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

      // Update guest data in customtext1
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
        console.log("Updated guest data:", {
          guestPassesUsed: updatedGuestPassesUsed,
          guestBookingIds: updatedGuestBookingIds,
          guests: updatedGuests,
        });
      }

      setBookings((prev) => [...prev, { ...booking, id: newId }]);
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
