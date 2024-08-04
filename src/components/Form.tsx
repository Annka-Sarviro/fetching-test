import axios from "axios";
import { ChangeEvent, FormEventHandler, useState } from "react";

export const Form = () => {
  const [value, setValue] = useState<number>(0);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [responses, setResponses] = useState<number[]>([]);

  const API_HOST = import.meta.env.VITE_API_HOST;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    if (newValue >= 0 && newValue <= 100) {
      setValue(newValue);
      setError("");
    } else {
      setError("Please enter a valid number between 0 and 100");
    }
  };

  const sendRequest = async (index: number) => {
    try {
      const response = await axios.post(`${API_HOST}api`, {
        index,
      });

      setResponses((prevResponses) => [
        ...prevResponses,
        response.data.data.result,
      ]);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          console.error(`Error sending request ${index}: Too many requests`);
        } else {
          console.error(
            `Error sending request ${index}:`,
            error.response?.data || error.message
          );
        }
      } else {
        console.error(`Error sending request ${index}:`, error);
      }
    }
  };

  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const manageRequests = async () => {
    const concurrencyLimit = value;
    const requestsLimit = value;
    const totalRequests = 1000;

    let index = 1;
    let activeRequests = 0;
    const requestQueue: Promise<void>[] = [];

    for (let i = 0; i < totalRequests; i++) {
      while (activeRequests >= concurrencyLimit) {
        await Promise.race(requestQueue);
      }

      const requestPromise = sendRequest(index++);
      requestQueue.push(requestPromise);
      activeRequests++;

      requestPromise.finally(() => {
        activeRequests--;
        requestQueue.splice(requestQueue.indexOf(requestPromise), 1);
      });

      if ((i + 1) % requestsLimit === 0) {
        await delay(1000);
      }
    }

    await Promise.all(requestQueue);
    setIsSending(false);
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    setIsSending(true);
    manageRequests();
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <label htmlFor="number-input">Enter a number:</label>
        <input
          id="number-input"
          type="number"
          value={value}
          onChange={handleChange}
          min="0"
          max="100"
          style={{ borderColor: error ? "red" : "black" }}
        />
        {error && <p style={{ color: "red" }}>{error}</p>}

        <button type="submit" disabled={isSending || value < 1}>
          Start
        </button>
      </form>
      <div>
        <p>Responses:</p>
        <ul>
          {responses.map((response, idx) => (
            <li key={idx}>{response}</li>
          ))}
        </ul>
      </div>
    </>
  );
};
