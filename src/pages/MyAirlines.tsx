// This page has been deprecated and redirects to Program Rules
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function MyAirlines() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to Program Rules page
    navigate("/settings/programs", { replace: true });
  }, [navigate]);

  return null;
}
