export default function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="p-3 rounded-xl bg-red-50 border border-red-200">
      <p className="text-sm text-red-600">{message}</p>
    </div>
  );
}
