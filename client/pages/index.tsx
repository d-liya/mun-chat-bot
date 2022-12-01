import moment from "moment";
import { useEffect, useReducer, useRef, useState } from "react";
import { HiArrowNarrowUp } from "react-icons/hi";
import { SiProbot } from "react-icons/si";
type MessageType = {
  timeStamp: number;
  question: string;
  answer?: string;
};
type State = {
  messages: MessageType[];
};
const initialState: State = {
  messages: [],
};

function reducer(state: State, action: { type: string; payload: MessageType }) {
  switch (action.type) {
    case "ADD_MESSAGE":
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    case "UPDATE_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((message) => {
          if (message.timeStamp === action.payload.timeStamp) {
            return { ...message, answer: action.payload.answer };
          }
          return message;
        }),
      };
    default:
      return state;
  }
}
export default function Home() {
  const [input, setInput] = useState("");
  const [state, dispatch] = useReducer(reducer, initialState);
  const [fetchStatus, setFetchStatus] = useState<
    "idle" | "success" | "error" | "loading"
  >("idle");
  const [loadingBar, setLoadingBar] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };
  const handleSend = () => {
    fetchAnswer(input);
  };
  const fetchAnswer = async (question: string) => {
    setLoadingBar(0);
    setFetchStatus("loading");
    try {
      const response = await fetch(
        "http://127.0.0.1:5000/answer?question=" + question
      );
      const data = await response.text();
      dispatch({
        type: "ADD_MESSAGE",
        payload: {
          timeStamp: Date.now(),
          question: input,
          answer: data,
        },
      });
      setFetchStatus("success");
    } catch (error) {
      console.log(error);
      setFetchStatus("error");
      alert("Something went wrong");
    }
    setInput("");
  };
  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (fetchStatus == "loading" && loadingBar < 70) {
      interval = setInterval(() => {
        setLoadingBar((prev) => prev + 1);
      }, 50);
    } else if (
      fetchStatus == "success" ||
      (fetchStatus == "error" && loadingBar < 100)
    ) {
      interval = setInterval(() => {
        setLoadingBar((prev) => prev + 1);
      }, 25);
    }
    if (loadingBar > 100) {
      setLoadingBar(0);
      setFetchStatus("idle");
    }
    return () => clearInterval(interval);
  }, [fetchStatus, loadingBar]);
  console.log(loadingBar);
  return (
    <div className="bg-black min-h-screen w-full flex justify-center items-center text-white">
      <section className="min-h-[70vh]  w-4/5  shadow-md rounded-lg flex flex-col justify-between bg-systemGray6">
        <div
          className="w-full rounded h-1.5"
          style={{
            opacity: loadingBar > 0 && loadingBar < 100 ? 1 : 0,
          }}
        >
          <div
            className="bg-blue-600 h-1.5 rounded transition-all"
            style={{
              width: `${loadingBar}%`,
            }}
          ></div>
        </div>
        <section
          id="chat-display"
          className="w-full overflow-y-auto max-h-[70vh] px-4 flex-1 relative"
        >
          <section className="flex justify-center items-center p-3 sticky bg-systemGray6 top-0 z-10">
            <SiProbot size={20} className="" />
            <h1 className="text-xl font-bold ml-2 font-mono">Mun-Bot</h1>
          </section>
          <ol className="relative border-l border-systemGray4 dark:border-gray-700 mx-6 overflow-x-visible ">
            {state.messages.map((message) => (
              <ChatDisplay key={message.timeStamp} {...message} />
            ))}
            <div ref={ref} />
          </ol>
        </section>
        <section
          id="user-input"
          className="w-full p-2 flex items-center relative"
        >
          <textarea
            id="message"
            rows={1}
            className="block p-2.5 w-full text-sm bg-systemGray4 rounded-lg border-0 ring-0 font-mono"
            placeholder="Your question here..."
            style={{ resize: "none" }}
            onChange={(e) => setInput(e.target.value)}
            value={input}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
          ></textarea>
          <button className="bg-blue-600 absolute right-5 rounded-full p-1">
            <HiArrowNarrowUp
              className="text-slate-300  cursor-pointer hover:text-slate-400 "
              size={20}
              onClick={handleSend}
            />
          </button>
        </section>
      </section>
    </div>
  );
}

const ChatDisplay = ({
  question,
  answer,
  timeStamp,
  isWaiting = false,
}: {
  question: string;
  answer?: string;
  timeStamp: number;
  isWaiting?: boolean;
}) => {
  return answer || isWaiting ? (
    <li className="my-6 ml-6">
      <span className="flex absolute -left-3 justify-center items-center w-6 h-6 rounded-full ring-8 ring-systemGray4 ">
        <SiProbot size={20} />
      </span>
      <div className="p-4 bg-systemGray5 rounded-lg  border-systemGray4 shadow-sm dark:bg-gray-700 dark:border-gray-600">
        <div className="justify-between items-center mb-3 sm:flex">
          <time className="mb-1 text-xs font-normal sm:order-last sm:mb-0 font-mono">
            {moment(timeStamp).fromNow()}
          </time>
          <div className="text font-normal  lex text-gray-300 font-mono">
            {question}
          </div>
        </div>
        <div className="p-3 text-sm italic font-normal  bg-systemGray4 rounded-lg  border-systemGray4 dark:bg-gray-600 dark:border-gray-500 text-gray-300 font-mono">
          {answer}
        </div>
      </div>
    </li>
  ) : (
    <li className="my-6 ml-6">
      <span className="flex absolute -left-3 justify-center items-center w-6 h-6 rounded-full ring-8 ring-systemGray4 ">
        <SiProbot size={20} />
      </span>
      <div className="justify-between items-center p-4 bg-systemGray4 rounded-lg  border-systemGray4 shadow-sm sm:flex">
        <time className="mb-1 text-xs font-normal sm:order-last sm:mb-0">
          {moment(timeStamp).fromNow()}
        </time>
        <div className="text-sm font-normal  lex dark:text-gray-300">
          {question}
        </div>
      </div>
    </li>
  );
};

const Loading = () => (
  <svg
    role="status"
    className="inline mr-3 w-5 h-5 text-white animate-spin absolute right-3 bg-blue-500 rounded-full p-1"
    viewBox="0 0 100 101"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
      fill="#E5E7EB"
    />
    <path
      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
      fill="currentColor"
    />
  </svg>
);
