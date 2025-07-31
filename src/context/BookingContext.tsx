/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import axios from "axios";
import {
  fetchGuestData,
  updateGuestData,
  updateMemberProfile,
} from "@/api/gymmaster";

export interface Booking {
  id: number;
  date: string;
  time: string;
  location: string;
  bay: string;
  servicename: string;
  guests: { name: string; email: string; date?: string }[];
  guestPassUsage: { free: number; charged: number };
  guestPassCharge: number | null;
  day: string;
  starttime: string;
  referralCodes?: string[];
  rid: number;
  bookingstart: string;
  bookingend: string;
}

interface BookingContextType {
  bookings: Booking[];
  addBooking: (
    booking: Omit<Booking, "id">,
    token: string,
    serviceId: number,
    resourceId: number,
    membershipId: number,
    benefitId?: number,
    availableGuestPasses?: number,
    guestPassCharge?: number | null
  ) => Promise<number>;
  deleteBooking: (id: number, token: string) => Promise<void>;
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
    benefitId?: number,
    availableGuestPasses: number = 0
    // guestPassCharge: number | null = null
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
        bookingstart,
        bookingend,
        referralCodes,
        rid,
        guestPassCharge: bookingGuestPassCharge,
      } = booking;

      // Decode JWT to get stable user ID
      const decodedToken = JSON.parse(atob(token.split(".")[1]));
      const stableUserId = Number(decodedToken.id);
      console.log("Stable User ID in addBooking:", stableUserId);

      // Fetch guest data
      const guestData = await fetchGuestData(token);
      const guestPassesUsed = guestData.guestPassesUsed || 0;
      const freePassesAvailable = Math.max(
        availableGuestPasses - guestPassesUsed,
        0
      );
      const calculatedGuestPassUsage = {
        free: Math.min(guests.length, freePassesAvailable),
        charged: Math.max(guests.length - freePassesAvailable, 0),
      };

      const bookingParams: Record<string, string> = {
        api_key: GYMMASTER_API_KEY || "",
        token,
        resourceid: rid.toString(),
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
            params: { api_key: GYMMASTER_API_KEY || "", token },
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

      // Save to MongoDB with stable userId
      await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: newId,
          date,
          time,
          location,
          bay,
          servicename,
          userId: stableUserId,
          guests,
          guestPassUsage: calculatedGuestPassUsage,
          guestPassCharge: bookingGuestPassCharge,
          day,
          starttime: bookingstart,
          referralCodes: referralCodes || [],
          rid,
          bookingstart,
          bookingend,
        }),
      });

      // Update customtext5 with bookingId for all bookings
      const updatedGuestBookingIds = [
        ...guestData.guestBookingIds,
        newId,
      ].filter((id) => Number.isInteger(id) && id > 0);
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
          console.warn("Booking ID update failed:", error.message);
          break;
        }
      }

      // Update guest data in GymMaster if guests exist
      if (guests.length > 0) {
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
          guestPassesUsed + calculatedGuestPassUsage.free;

        retryCount = 0;
        while (retryCount < maxRetries) {
          try {
            await updateGuestData(
              token,
              updatedGuestPassesUsed,
              referralCodes || guestData.referralCodes,
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
                  guestPassUsage: calculatedGuestPassUsage,
                  guestPassCharge: bookingGuestPassCharge,
                }
              : b
          );
        }
        return [
          ...prev,
          {
            ...booking,
            id: newId,
            guestPassUsage: calculatedGuestPassUsage,
            guestPassCharge: bookingGuestPassCharge,
          },
        ];
      });

      return newId;
    } catch (error) {
      console.error("Add booking error:", error);
      throw error;
    }
  };

  const deleteBooking = async (id: number, token: string): Promise<void> => {
    try {
      // Decode JWT to get stable user ID
      const decodedToken = JSON.parse(atob(token.split(".")[1]));
      const stableUserId = Number(decodedToken.id);
      console.log("Stable User ID in deleteBooking:", stableUserId);

      const response = await axios.post(
        "/api/gymmaster/v1/member/cancelbooking",
        new URLSearchParams({
          api_key: GYMMASTER_API_KEY || "",
          token,
          bookingid: id.toString(),
          list: "0",
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error || "Failed to cancel booking");
      }

      // Delete from MongoDB using stable userId
      await fetch("/api/bookings/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id, userId: stableUserId }),
      });

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
            console.warn("Booking ID update failed:", error.message);
            break;
          }
        }
      } catch (error) {
        console.warn("Non-critical error updating booking IDs:", error);
      }

      let gymMasterBookings: any[] = [];
      try {
        const bookingsResponse = await axios.get(
          "/api/gymmaster/v2/member/bookings",
          {
            params: { api_key: GYMMASTER_API_KEY || "", token },
          }
        );
        gymMasterBookings = bookingsResponse.data.result?.servicebookings || [];
      } catch (error) {
        console.warn("Failed to fetch GymMaster bookings:", error);
      }

      let mongoBookings: Booking[] = [];
      try {
        const mongoFetchResponse = await fetch("/api/bookings/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: stableUserId }),
        });
        if (!mongoFetchResponse.ok) {
          throw new Error("Failed to fetch bookings from MongoDB");
        }
        const { bookings } = await mongoFetchResponse.json();
        mongoBookings = bookings;
      } catch (error) {
        console.warn("Failed to fetch MongoDB bookings:", error);
      }

      const updatedBookings = gymMasterBookings
        .filter((b: any) =>
          mongoBookings.some((mb: Booking) => mb.id === Number(b.id))
        )
        .map((b: any) => {
          const mongoBooking = mongoBookings.find(
            (mb: Booking) => mb.id === Number(b.id)
          );
          return {
            id: Number(b.id),
            date: b.day,
            time: mongoBooking?.time || b.starttime,
            location: b.location || mongoBooking?.location || "",
            bay: b.name,
            servicename: b.servicename,
            guests: mongoBooking?.guests || [],
            guestPassUsage: mongoBooking?.guestPassUsage || {
              free: 0,
              charged: 0,
            },
            guestPassCharge: mongoBooking?.guestPassCharge || null,
            day:
              mongoBooking?.day ||
              new Date(b.day).toLocaleDateString("en-US", { weekday: "long" }),
            starttime: b.starttime,
            referralCodes: mongoBooking?.referralCodes || [],
            rid: Number(b.resourceid),
            bookingstart: b.starttime,
            bookingend: b.endtime,
          };
        });

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
