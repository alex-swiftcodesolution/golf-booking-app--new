"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { fetchMemberBookings } from "@/api/gymmaster";

interface Booking {
  id: number;
  date: string;
  time: string;
  location: string;
  bay: string;
  guests: { name: string; cell: string }[];
  guestPassUsage: { free: number; charged: number };
}

interface BookingContextType {
  bookings: Booking[];
  addBooking: (booking: Omit<Booking, "id">) => Promise<number>;
  deleteBooking: (id: number) => void;
  updateBooking: (id: number, updatedBooking: Partial<Booking>) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      fetchMemberBookings(token)
        .then((fetchedBookings) => {
          // Ensure fetchedBookings is an array; default to empty array if undefined/null
          const validBookings = Array.isArray(fetchedBookings)
            ? fetchedBookings
            : [];
          setBookings(
            validBookings.map((b) => ({
              id: b.id,
              date: b.day,
              time: b.start_str || b.starttime, // Use start_str (HH:MMAM) if available, fallback to starttime
              location: "Simcognito's Golf 2/47 Club", // Adjust if multi-club
              bay: b.name,
              guests: [], // API doesn’t return guests—local only
              guestPassUsage: { free: 0, charged: 0 }, // Placeholder
            }))
          );
        })
        .catch((err) => {
          console.error("Failed to fetch bookings:", err);
          setBookings([]); // Set empty array on error to avoid breaking the app
        });
    }
  }, []);

  const addBooking = async (booking: Omit<Booking, "id">): Promise<number> => {
    const newId = Date.now(); // Temp until POST returns real ID
    setBookings((prev) => [...prev, { ...booking, id: newId }]);
    return newId; // Replace with real ID from POST response later
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
      value={{ bookings, addBooking, deleteBooking, updateBooking }}
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
