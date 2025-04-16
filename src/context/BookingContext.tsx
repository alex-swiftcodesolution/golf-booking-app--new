"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import axios from "axios";

interface Booking {
  id: number;
  date: string;
  time: string;
  location: string;
  bay: string;
  guests: { name: string; cell: string }[];
  guestPassUsage: { free: number; charged: number };
  day: string;
  starttime: string;
  start_str?: string;
  name?: string;
}

interface BookingContextType {
  bookings: Booking[];
  addBooking: (booking: Omit<Booking, "id">) => Promise<number>;
  deleteBooking: (id: number) => void;
  updateBooking: (id: number, updatedBooking: Partial<Booking>) => void;
  setBookings: (bookings: Booking[]) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

const GYMMASTER_API_KEY = process.env.NEXT_PUBLIC_GYMMASTER_API_KEY;

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

        const response = await axios.get("/api/gymmaster/v2/member/bookings", {
          params: {
            api_key: GYMMASTER_API_KEY,
            token,
          },
        });

        console.log("Bookings Response:", response.data);

        const fetchedBookings =
          response.data.servicebookings?.map((b: Booking) => {
            // Normalize time to 24-hour format (e.g., "9:00 am" -> "09:00")
            let time = b.starttime.slice(0, 5); // Default to "HH:MM"
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

            return {
              id: b.id,
              date: b.day,
              time,
              location: b.location || "Simcognito's Golf 2/47 Club",
              bay: b.name || "Unknown",
              guests: [], // No guest data from API
              guestPassUsage: { free: 0, charged: 0 }, // Placeholder
            };
          }) || [];

        console.log("Mapped Bookings:", fetchedBookings);
        setBookings(fetchedBookings);
      } catch (err) {
        console.error("Failed to fetch bookings:", err);
        setBookings([]);
      }
    };

    fetchBookings();
  }, []);

  const addBooking = async (booking: Omit<Booking, "id">): Promise<number> => {
    const newId = Date.now(); // Temp until POST returns real ID
    console.log("Adding booking with temp ID:", newId, booking);
    setBookings((prev) => [...prev, { ...booking, id: newId }]);
    return newId; // Replace with real ID from POST later
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
