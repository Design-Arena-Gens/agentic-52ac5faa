import Chat from "@/components/Chat";

export default function Page() {
  return (
    <main className="max-w-3xl mx-auto p-4">
      <h1 className="text-3xl font-semibold mb-2">AI Receptionist</h1>
      <p className="mb-4 text-gray-600">
        I can schedule or reschedule appointments, confirm bookings, answer FAQs, and collect your details.
      </p>
      <Chat />
    </main>
  );
}

