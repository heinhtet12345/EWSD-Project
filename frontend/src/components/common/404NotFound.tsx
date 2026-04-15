import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="mb-10 text-4xl font-bold text-black">404 - Page Not Found</h1>
      <Link to="/">
        <button
          type="button"
          className="mb-4 rounded-full bg-red-700 px-6 py-3 text-lg font-medium text-white hover:bg-red-800 focus:outline-none focus:ring-4 focus:ring-red-300"
        >
          Home
        </button>
      </Link>
    </div>
  );
}
