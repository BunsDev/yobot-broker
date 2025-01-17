import Image from "next/image";
import React from "react";
import { useEffect, useState } from "react";
import { useYobot } from "src/contexts/YobotContext";
import web3 from "web3";

const EmptyAddress = "0x0000000000000000000000000000000000000000";

const ProjectDetails = ({ props }) => {
  const { yobot, address, actions, chainId, refreshEvents } = useYobot();

  // Total number of non-cancelled bids (i.e. open placed bids + filled bids)
  const totalBids =
    props.project.totalBids != null && props.project.totalBids >= 0
      ? props.project.totalBids
      : "-";

  // Highest bid in ether
  const highestBid =
    props.project.highestBid != null && props.project.highestBid >= 0
      ? props.project.highestBid
      : "-";

  // Mint price in ether
  const mintPrice =
    props.project.mint_price != null && props.project.mint_price >= 0
      ? web3.utils.fromWei(props.project.mint_price.toString(), "ether")
      : "-";

  const calculateTimeLeft = () => {
    let difference = props.project.launch_time
      ? // @ts-ignore
        new Date(props.project.launch_time) - new Date()
      : 0;

    let timeLeft = {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    return timeLeft;
  };
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearTimeout(timer);
  });

  return (
    <div className="flex flex-col overflow-hidden text-left rounded-lg shadow-sm min-w-437 bg-zinc sm:mx-0 sm:w-437">
      <div className="flex-grow w-full p-5 space-y-4 ">
        {/* NFT image, title and description Start */}
        <div className="flex flex-col items-start">
          <Image
            src={
              props.project.image_src
                ? props.project.image_src
                : "/etherscan.png"
            }
            alt="NFT Project Image"
            className="flex-none inline-block w-full mb-6 sm:w-3/12"
            width={100}
            height={100}
          />

          <div className="flex-grow">
            <p className="mt-6 mb-6">
              <a
                href={props.project.website}
                className="text-lg font-semibold hover:text-yobotgreen"
              >
                {props.project.title}{" "}
                <span className="font-normal">
                  {" "}
                  | Base Mint Price: {mintPrice} Ξ
                </span>
              </a>
              {/* <span className="text-gray-500 sm:hidden">· 03h:13m:34s</span> */}
            </p>

            <p className="mb-4 text-base leading-relaxed">
              {props.project.description}
            </p>
          </div>

          {/* BADGES */}
          {props.project.network == 5 ? (
            <div className="flex justify-start mb-4 hidden px-2 py-1 text-xs font-semibold leading-4 text-red-700 bg-red-200 rounded-full md:inline-block">
              Goerli Testnet
            </div>
          ) : null}
          {/* <div className="flex justify-start mb-4">
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800 mr-2">
              Generative
            </span>
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mr-2">
              Placeholder
            </span>
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 mr-2">
              Placeholder
            </span>
          </div> */}
          {/* END BADGES */}
        </div>
        {/* NFT image, title and description End */}
      </div>
      <div className="grid visible hidden grid-cols-1 gap-4 sm:inline-block">
        <div className="grid grid-cols-3 p-4 bg-yobotblack">
          {/* Highest Bid Card Start */}
          <div className="flex flex-col overflow-hidden rounded shadow-sm">
            <div className="flex-grow w-full p-2">
              <dl>
                <dd className="text-lg font-semibold tracking-wider text-textgray">
                  Minting in
                </dd>
                <dt className="text-lg font-semibold text-white">
                  <span>{timeLeft.days}d </span>
                  <span>{timeLeft.hours}h </span>

                  <span>{timeLeft.minutes}m </span>

                  <span>{timeLeft.seconds}s</span>
                </dt>
              </dl>
            </div>
          </div>
          {/* DOUBLE */}
          <div className="flex flex-col overflow-hidden rounded shadow-sm">
            <div className="flex-grow w-full p-2">
              <dl>
                <dd className="text-lg font-semibold tracking-wider text-textgray">
                  Highest Bid
                </dd>
                <dt className="text-lg font-semibold text-white">
                  {props.gettingActions || address == EmptyAddress
                    ? "-"
                    : highestBid}
                </dt>
              </dl>
            </div>
          </div>

          {/* Highest Bid Card End */}

          {/* Total Bids Card Start */}
          <div className="flex flex-col overflow-hidden rounded shadow-sm">
            <div className="flex-grow w-full p-2">
              <dl>
                <dd className="text-lg font-semibold tracking-wider text-textgray ">
                  Open Bids
                </dd>
                <dt className="text-lg font-semibold text-white">
                  {props.gettingActions || address == EmptyAddress
                    ? "-"
                    : totalBids}
                </dt>
              </dl>
            </div>
          </div>
          {/* Total Bids Card End */}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;
