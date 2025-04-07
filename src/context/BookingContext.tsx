"use client";
import { createContext, useContext, useState, ReactNode } from "react";

// Define the Booking type
interface Booking {
  id: number;
  date: string;
  time: string;
  location: string;
  bay: string;
  guests: { name: string; cell: string }[];
  guestPassUsage: { free: number; charged: number };
}

// Define the context type
interface BookingContextType {
  bookings: Booking[];
  addBooking: (booking: Omit<Booking, "id">) => void;
  deleteBooking: (id: number) => void;
  updateBooking: (id: number, updatedBooking: Partial<Booking>) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

// Mock initial bookings
const initialBookings: Booking[] = [
  {
    id: 1,
    date: "2025-03-22",
    time: "9:00 AM",
    location: "Location 1",
    bay: "Bay 1",
    guests: [
      { name: "Jane Doe", cell: "+1-123-456-7890" },
      { name: "John Smith", cell: "+1-234-567-8901" },
    ],
    guestPassUsage: { free: 2, charged: 0 },
  },
  {
    id: 2,
    date: "2025-03-23",
    time: "2:00 PM",
    location: "Location 2",
    bay: "Bay 2",
    guests: [],
    guestPassUsage: { free: 0, charged: 0 },
  },
];

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);

  const addBooking = (booking: Omit<Booking, "id">) => {
    setBookings((prev) => [
      ...prev,
      {
        ...booking,
        id: Date.now(), // More unique than incremental IDs
      },
    ]);
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
