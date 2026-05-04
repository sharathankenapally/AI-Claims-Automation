import { Link } from "wouter";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
      <AlertCircle className="w-12 h-12 text-muted-foreground" />
      <div>
        <h1 className="text-xl font-bold text-foreground">404 — Not Found</h1>
        <p className="text-sm text-muted-foreground mt-1">This page doesn't exist in the claims system.</p>
      </div>
      <Link href="/">
        <a className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
          Back to Dashboard
        </a>
      </Link>
    </div>
  );
}
