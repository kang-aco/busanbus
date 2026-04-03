export default function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
      <p className="text-sm text-red-400">{message}</p>
    </div>
  );
}
