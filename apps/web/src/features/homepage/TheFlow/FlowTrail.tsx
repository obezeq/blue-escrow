'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import styles from './TheFlow.module.scss';

export interface FlowTrailHandle {
  svgEl: SVGSVGElement | null;
  trailPath: SVGPathElement | null;
  particle: SVGCircleElement | null;
  contractGlow: SVGRectElement | null;
  checkmark: SVGGElement | null;
  feeLabel: SVGTextElement | null;
}

// Main trail curve: buyer (left) → contract (center) → seller (right)
const TRAIL_D =
  'M 100 350 C 250 350, 350 250, 500 250 C 650 250, 750 350, 900 350';

export const FlowTrail = forwardRef<FlowTrailHandle>(
  function FlowTrail(_props, ref) {
    const svgRef = useRef<SVGSVGElement>(null);
    const pathRef = useRef<SVGPathElement>(null);
    const particleRef = useRef<SVGCircleElement>(null);
    const contractRef = useRef<SVGRectElement>(null);
    const checkmarkRef = useRef<SVGGElement>(null);
    const feeRef = useRef<SVGTextElement>(null);

    useImperativeHandle(ref, () => ({
      svgEl: svgRef.current,
      trailPath: pathRef.current,
      particle: particleRef.current,
      contractGlow: contractRef.current,
      checkmark: checkmarkRef.current,
      feeLabel: feeRef.current,
    }));

    // Set stroke-dasharray/dashoffset from measured path length
    useEffect(() => {
      if (!pathRef.current || !pathRef.current.getTotalLength) return;
      const len = pathRef.current.getTotalLength();
      pathRef.current.setAttribute('stroke-dasharray', String(len));
      pathRef.current.setAttribute('stroke-dashoffset', String(len));
    }, []);

    return (
      <svg
        ref={svgRef}
        viewBox="0 0 1000 500"
        className={styles.flow__svg}
        role="img"
        aria-label="Money flows from buyer through smart contract to seller"
      >
        <defs>
          <linearGradient
            id="trail-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#0066FF" />
            <stop offset="100%" stopColor="#33AAFF" />
          </linearGradient>
          <filter id="particle-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Main trail path */}
        <path
          ref={pathRef}
          d={TRAIL_D}
          stroke="url(#trail-gradient)"
          strokeWidth={3}
          fill="none"
          data-animate="trail-path"
        />

        {/* Buyer node */}
        <g data-node="buyer">
          <circle cx={100} cy={350} r={8} fill="var(--blue-primary)" />
          <text
            x={100}
            y={395}
            textAnchor="middle"
            className={styles.flow__label}
          >
            Buyer
          </text>
        </g>

        {/* Contract node */}
        <g data-node="contract">
          <rect
            ref={contractRef}
            x={460}
            y={220}
            width={80}
            height={60}
            rx={8}
            fill="rgba(0, 102, 255, 0.1)"
            stroke="var(--gray-border)"
            strokeWidth={1.5}
            data-animate="contract-glow"
          />
          <text
            x={500}
            y={310}
            textAnchor="middle"
            className={styles.flow__label}
          >
            Smart Contract
          </text>
        </g>

        {/* Seller node */}
        <g data-node="seller">
          <circle cx={900} cy={350} r={8} fill="#33AAFF" />
          <text
            x={900}
            y={395}
            textAnchor="middle"
            className={styles.flow__label}
          >
            Seller
          </text>
        </g>

        {/* Middleman — disconnected, dashed */}
        <g data-node="middleman">
          <line
            x1={500}
            y1={220}
            x2={500}
            y2={120}
            stroke="#999"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            opacity={0.5}
          />
          <circle cx={500} cy={100} r={6} fill="#999" opacity={0.6} />
          <text
            x={500}
            y={80}
            textAnchor="middle"
            className={styles.flow__labelMuted}
          >
            Middleman
          </text>
        </g>

        {/* Glowing particle */}
        <circle
          ref={particleRef}
          cx={100}
          cy={350}
          r={6}
          fill="var(--blue-primary)"
          filter="url(#particle-glow)"
          data-animate="particle"
        />

        {/* Checkmark at seller (hidden initially) */}
        <g ref={checkmarkRef} data-animate="checkmark" opacity={0}>
          <circle
            cx={900}
            cy={350}
            r={16}
            fill="none"
            stroke="#33AAFF"
            strokeWidth={2}
          />
          <path
            d="M892 350 L898 356 L910 344"
            stroke="#33AAFF"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Fee label (hidden initially) */}
        <text
          ref={feeRef}
          x={500}
          y={340}
          textAnchor="middle"
          data-animate="fee"
          opacity={0}
          className={styles.flow__feeBadge}
        >
          0.33% fee
        </text>
      </svg>
    );
  },
);
