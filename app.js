(() => {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const MIN_TEETH = 6;
  const MAX_TEETH = 30;
  const STAGE_WIDTH = 760;
  const STAGE_HEIGHT = 440;
  const TIMELINE_WIDTH = 720;
  const TIMELINE_HEIGHT = 116;

  /* =========================================================================
   * 1. TẦNG TOÁN HỌC THUẦN TÚY (Pure Mathematical Functions)
   * ========================================================================= */
  const MathEngine = {
    gcd(a, b) {
      let x = Math.abs(Math.trunc(a));
      let y = Math.abs(Math.trunc(b));
      while (y !== 0) {
        const temp = y;
        y = x % y;
        x = temp;
      }
      return x || 1;
    },

    lcm(a, b) {
      const x = Math.abs(Math.trunc(a));
      const y = Math.abs(Math.trunc(b));
      if (x === 0 || y === 0) return 0;
      return (x * y) / MathEngine.gcd(x, y);
    },

    factorize(n) {
      let val = Math.abs(Math.trunc(n));
      const factors = [];
      if (val < 2) return factors;
      let divisor = 2;
      while (divisor * divisor <= val) {
        let power = 0;
        while (val % divisor === 0) {
          val /= divisor;
          power += 1;
        }
        if (power > 0) {
          factors.push({ prime: divisor, power });
        }
        divisor += divisor === 2 ? 1 : 2;
      }
      if (val > 1) {
        factors.push({ prime: val, power: 1 });
      }
      return factors;
    },

    toSuperscript(num) {
      const map = {
        '0': '⁰',
        '1': '¹',
        '2': '²',
        '3': '³',
        '4': '⁴',
        '5': '⁵',
        '6': '⁶',
        '7': '⁷',
        '8': '⁸',
        '9': '⁹',
      };
      return String(num)
        .split('')
        .map((ch) => map[ch] || ch)
        .join('');
    },

    formatFactorization(factors) {
      if (factors.length === 0) return '1';
      return factors
        .map((item) =>
          item.power > 1
            ? `${item.prime}${MathEngine.toSuperscript(item.power)}`
            : `${item.prime}`
        )
        .join(' × ');
    },

    computeGearAnalysis(teethA, teethB) {
      const gcdVal = MathEngine.gcd(teethA, teethB);
      const lcmVal = MathEngine.lcm(teethA, teethB);
      const revsAForLcm = lcmVal / teethA;
      const revsBForLcm = lcmVal / teethB;
      const ratioA = teethA / gcdVal;
      const ratioB = teethB / gcdVal;

      const multiplesA = [];
      for (let k = 1; k <= revsAForLcm; k += 1) {
        multiplesA.push(k * teethA);
      }

      const multiplesB = [];
      for (let k = 1; k <= revsBForLcm; k += 1) {
        multiplesB.push(k * teethB);
      }

      return {
        teethA,
        teethB,
        gcd: gcdVal,
        lcm: lcmVal,
        revsAForLcm,
        revsBForLcm,
        ratioA,
        ratioB,
        factorsA: MathEngine.formatFactorization(MathEngine.factorize(teethA)),
        factorsB: MathEngine.formatFactorization(MathEngine.factorize(teethB)),
        multiplesA,
        multiplesB,
      };
    },

    computeKinematics(teethA, teethB, teethMeshed, lcmVal) {
      const revsA = teethMeshed / teethA;
      const revsB = teethMeshed / teethB;
      const angleA = revsA * 360;
      const angleB = -revsB * 360;

      const isAtStart = teethMeshed < 0.001;
      const nearestMultipleCount = Math.round(teethMeshed / lcmVal);
      const nearestMultipleTeeth = nearestMultipleCount * lcmVal;
      const isAtLcm =
        !isAtStart &&
        nearestMultipleCount >= 1 &&
        Math.abs(teethMeshed - nearestMultipleTeeth) < 0.04;

      return {
        teethMeshed,
        revsA,
        revsB,
        angleA,
        angleB,
        isAtStart,
        isAtLcm,
        isAligned: isAtStart || isAtLcm,
        lcmMultipleIndex: nearestMultipleCount,
      };
    },

    computeStageLayout(teethA, teethB, width, height) {
      const availWidth = width - 104;
      const availHeight = height - 104;
      const maxSingle = Math.max(teethA, teethB);
      const moduleByWidth = availWidth / (teethA + teethB + 2.2);
      const moduleByHeight = availHeight / (maxSingle + 2.2);
      const mod = Math.min(moduleByWidth, moduleByHeight, 22);

      const pitchRadiusA = 0.5 * mod * teethA;
      const pitchRadiusB = 0.5 * mod * teethB;
      const addendum = 0.85 * mod;
      const dedendum = 1.05 * mod;

      const outerRadiusA = pitchRadiusA + addendum;
      const outerRadiusB = pitchRadiusB + addendum;
      const rootRadiusA = Math.max(8, pitchRadiusA - dedendum);
      const rootRadiusB = Math.max(8, pitchRadiusB - dedendum);

      const totalSpan = outerRadiusA + pitchRadiusA + pitchRadiusB + outerRadiusB;
      const startX = (width - totalSpan) / 2;

      const cxA = startX + outerRadiusA;
      const cxB = cxA + pitchRadiusA + pitchRadiusB;
      const cy = height / 2;
      const pitchPointX = cxA + pitchRadiusA;
      const pitchPointY = cy;

      return {
        module: mod,
        pitchRadiusA,
        pitchRadiusB,
        outerRadiusA,
        outerRadiusB,
        rootRadiusA,
        rootRadiusB,
        cxA,
        cxB,
        cy,
        pitchPointX,
        pitchPointY,
      };
    },

    polarToCartesian(cx, cy, radius, angleRad) {
      return {
        x: cx + radius * Math.cos(angleRad),
        y: cy + radius * Math.sin(angleRad),
      };
    },

    buildGearPath(cx, cy, teeth, pitchRadius, mod, phaseOffsetRad) {
      const addendum = 0.85 * mod;
      const dedendum = 1.05 * mod;
      const outerR = pitchRadius + addendum;
      const rootR = Math.max(8, pitchRadius - dedendum);
      const step = (2 * Math.PI) / teeth;

      const halfRoot = 0.265 * step;
      const halfPitch = 0.225 * step;
      const halfTip = 0.135 * step;

      const segments = [];
      for (let i = 0; i < teeth; i += 1) {
        const centerAngle = phaseOffsetRad + i * step;
        const p1 = MathEngine.polarToCartesian(cx, cy, rootR, centerAngle - halfRoot);
        const p2 = MathEngine.polarToCartesian(cx, cy, pitchRadius, centerAngle - halfPitch);
        const p3 = MathEngine.polarToCartesian(cx, cy, outerR, centerAngle - halfTip);
        const p4 = MathEngine.polarToCartesian(cx, cy, outerR, centerAngle + halfTip);
        const p5 = MathEngine.polarToCartesian(cx, cy, pitchRadius, centerAngle + halfPitch);
        const p6 = MathEngine.polarToCartesian(cx, cy, rootR, centerAngle + halfRoot);

        if (i === 0) {
          segments.push(`M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`);
        } else {
          segments.push(
            `A ${rootR.toFixed(2)} ${rootR.toFixed(2)} 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`
          );
        }

        segments.push(`L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`);
        segments.push(`L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`);
        segments.push(
          `A ${outerR.toFixed(2)} ${outerR.toFixed(2)} 0 0 1 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`
        );
        segments.push(`L ${p5.x.toFixed(2)} ${p5.y.toFixed(2)}`);
        segments.push(`L ${p6.x.toFixed(2)} ${p6.y.toFixed(2)}`);
      }

      const firstPoint = MathEngine.polarToCartesian(
        cx,
        cy,
        rootR,
        phaseOffsetRad - halfRoot
      );
      segments.push(
        `A ${rootR.toFixed(2)} ${rootR.toFixed(2)} 0 0 1 ${firstPoint.x.toFixed(2)} ${firstPoint.y.toFixed(2)}`
      );
      segments.push('Z');
      return segments.join(' ');
    },

    buildCutoutPaths(cx, cy, rootRadius, hubRadius) {
      const innerCut = hubRadius + 10;
      const outerCut = rootRadius - 10;
      if (outerCut - innerCut < 12) return [];

      const spokeCount = rootRadius > 82 ? 6 : 5;
      const spokeGapRad = 0.28;
      const sector = (2 * Math.PI) / spokeCount;
      const paths = [];

      for (let i = 0; i < spokeCount; i += 1) {
        const aStart = i * sector + spokeGapRad / 2;
        const aEnd = (i + 1) * sector - spokeGapRad / 2;
        if (aEnd <= aStart) continue;

        const p1 = MathEngine.polarToCartesian(cx, cy, innerCut, aStart);
        const p2 = MathEngine.polarToCartesian(cx, cy, outerCut, aStart);
        const p3 = MathEngine.polarToCartesian(cx, cy, outerCut, aEnd);
        const p4 = MathEngine.polarToCartesian(cx, cy, innerCut, aEnd);

        const largeArc = aEnd - aStart > Math.PI ? 1 : 0;
        const d = [
          `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
          `L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
          `A ${outerCut.toFixed(2)} ${outerCut.toFixed(2)} 0 ${largeArc} 1 ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
          `L ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
          `A ${innerCut.toFixed(2)} ${innerCut.toFixed(2)} 0 ${largeArc} 0 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
          'Z',
        ].join(' ');
        paths.push(d);
      }

      return paths;
    },
  };

  /* =========================================================================
   * 2. TẦNG DỰNG HÌNH SVG & DOM (Pure Class/CSS-Driven Renderer)
   * ========================================================================= */
  const SvgRenderer = {
    createSvgEl(tag, attrs) {
      const el = document.createElementNS(SVG_NS, tag);
      if (attrs) {
        Object.keys(attrs).forEach((key) => {
          el.setAttribute(key, String(attrs[key]));
        });
      }
      return el;
    },

    buildDirectionArc(cx, cy, radius, startDeg, sweepDeg) {
      const startRad = (startDeg * Math.PI) / 180;
      const endRad = ((startDeg + sweepDeg) * Math.PI) / 180;
      const p1 = MathEngine.polarToCartesian(cx, cy, radius, startRad);
      const p2 = MathEngine.polarToCartesian(cx, cy, radius, endRad);
      const sweepFlag = sweepDeg >= 0 ? 1 : 0;
      const arcD = `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 0 ${sweepFlag} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;

      const tangentAngle = endRad + (sweepDeg >= 0 ? Math.PI / 2 : -Math.PI / 2);
      const tip = MathEngine.polarToCartesian(p2.x, p2.y, 6, tangentAngle);
      const wingLeft = MathEngine.polarToCartesian(
        p2.x,
        p2.y,
        4.5,
        tangentAngle + 2.35
      );
      const wingRight = MathEngine.polarToCartesian(
        p2.x,
        p2.y,
        4.5,
        tangentAngle - 2.35
      );
      const arrowD = `M ${tip.x.toFixed(2)} ${tip.y.toFixed(2)} L ${wingLeft.x.toFixed(2)} ${wingLeft.y.toFixed(2)} L ${wingRight.x.toFixed(2)} ${wingRight.y.toFixed(2)} Z`;

      return { arcD, arrowD };
    },

    renderStage(dom, state) {
      const layout = MathEngine.computeStageLayout(
        state.teethA,
        state.teethB,
        STAGE_WIDTH,
        STAGE_HEIGHT
      );

      dom.axisLayer.replaceChildren();
      dom.gearsLayer.replaceChildren();
      dom.contactLayer.replaceChildren();

      // Axis center line
      dom.axisLayer.appendChild(
        SvgRenderer.createSvgEl('line', {
          x1: layout.cxA.toFixed(2),
          y1: layout.cy.toFixed(2),
          x2: layout.cxB.toFixed(2),
          y2: layout.cy.toFixed(2),
          class: 'gl-axis-line',
        })
      );

      // Build Gear A (clockwise rotation, tooth 0 at angle 0 pointing right)
      const gearAGroup = SvgRenderer.buildGearGroup({
        id: 'gl-gear-group-a',
        className: 'gl-gear-a',
        label: 'A',
        cx: layout.cxA,
        cy: layout.cy,
        teeth: state.teethA,
        pitchRadius: layout.pitchRadiusA,
        rootRadius: layout.rootRadiusA,
        mod: layout.module,
        phaseOffsetRad: 0,
        markerAngleRad: 0,
        reverseLabelIndex: true,
        directionSweepDeg: 42,
        directionStartDeg: -115,
      });

      // Build Gear B (counter-clockwise rotation, valley 0 at angle PI pointing left)
      const stepB = (2 * Math.PI) / state.teethB;
      const gearBGroup = SvgRenderer.buildGearGroup({
        id: 'gl-gear-group-b',
        className: 'gl-gear-b',
        label: 'B',
        cx: layout.cxB,
        cy: layout.cy,
        teeth: state.teethB,
        pitchRadius: layout.pitchRadiusB,
        rootRadius: layout.rootRadiusB,
        mod: layout.module,
        phaseOffsetRad: Math.PI + stepB * 0.5,
        markerAngleRad: Math.PI,
        reverseLabelIndex: false,
        directionSweepDeg: -42,
        directionStartDeg: -65,
      });

      dom.gearsLayer.appendChild(gearAGroup.outerGroup);
      dom.gearsLayer.appendChild(gearBGroup.outerGroup);

      // Contact Zone / Pitch Point Target
      const contactGroup = SvgRenderer.createSvgEl('g', {
        id: 'gl-contact-zone',
        class: 'gl-contact-zone',
      });

      const guideTopY = Math.max(28, layout.cy - Math.max(layout.outerRadiusA, layout.outerRadiusB) - 18);
      const guideBottomY = Math.min(
        STAGE_HEIGHT - 24,
        layout.cy + Math.max(layout.outerRadiusA, layout.outerRadiusB) + 18
      );

      contactGroup.appendChild(
        SvgRenderer.createSvgEl('line', {
          x1: layout.pitchPointX.toFixed(2),
          y1: guideTopY.toFixed(2),
          x2: layout.pitchPointX.toFixed(2),
          y2: guideBottomY.toFixed(2),
          class: 'gl-contact-guide',
        })
      );

      contactGroup.appendChild(
        SvgRenderer.createSvgEl('circle', {
          cx: layout.pitchPointX.toFixed(2),
          cy: layout.pitchPointY.toFixed(2),
          r: '18',
          class: 'gl-contact-halo',
        })
      );

      contactGroup.appendChild(
        SvgRenderer.createSvgEl('circle', {
          cx: layout.pitchPointX.toFixed(2),
          cy: layout.pitchPointY.toFixed(2),
          r: '13',
          class: 'gl-contact-ring',
        })
      );

      const pillWidth = 104;
      const pillHeight = 22;
      const pillY = Math.max(8, guideTopY - 24);
      contactGroup.appendChild(
        SvgRenderer.createSvgEl('rect', {
          x: (layout.pitchPointX - pillWidth / 2).toFixed(2),
          y: pillY.toFixed(2),
          width: pillWidth,
          height: pillHeight,
          rx: '6',
          class: 'gl-contact-pill-bg',
        })
      );

      const pillText = SvgRenderer.createSvgEl('text', {
        x: layout.pitchPointX.toFixed(2),
        y: (pillY + pillHeight / 2).toFixed(2),
        class: 'gl-contact-pill-text',
        id: 'gl-contact-label',
      });
      pillText.textContent = 'Điểm tiếp xúc';
      contactGroup.appendChild(pillText);

      dom.contactLayer.appendChild(contactGroup);

      return {
        layout,
        rotatorA: gearAGroup.rotator,
        rotatorB: gearBGroup.rotator,
        gearAEl: gearAGroup.outerGroup,
        gearBEl: gearBGroup.outerGroup,
        contactZone: contactGroup,
        contactLabel: pillText,
      };
    },

    buildGearGroup(config) {
      const outerGroup = SvgRenderer.createSvgEl('g', {
        class: config.className,
      });

      // Static pitch circle & direction indicator around the gear
      outerGroup.appendChild(
        SvgRenderer.createSvgEl('circle', {
          cx: config.cx.toFixed(2),
          cy: config.cy.toFixed(2),
          r: config.pitchRadius.toFixed(2),
          class: 'gl-pitch-circle',
        })
      );

      const dirRadius = config.pitchRadius + 1.45 * config.mod + 12;
      if (dirRadius < STAGE_HEIGHT / 2 - 14) {
        const dirData = SvgRenderer.buildDirectionArc(
          config.cx,
          config.cy,
          dirRadius,
          config.directionStartDeg,
          config.directionSweepDeg
        );
        outerGroup.appendChild(
          SvgRenderer.createSvgEl('path', {
            d: dirData.arcD,
            class: 'gl-direction-arc',
          })
        );
        outerGroup.appendChild(
          SvgRenderer.createSvgEl('path', {
            d: dirData.arrowD,
            class: 'gl-direction-arrow',
          })
        );
      }

      // Rotating gear body group
      const rotator = SvgRenderer.createSvgEl('g', {
        id: config.id,
      });

      const bodyPath = MathEngine.buildGearPath(
        config.cx,
        config.cy,
        config.teeth,
        config.pitchRadius,
        config.mod,
        config.phaseOffsetRad
      );

      rotator.appendChild(
        SvgRenderer.createSvgEl('path', {
          d: bodyPath,
          class: 'gl-gear-body',
        })
      );

      const hubRadius = Math.min(20, Math.max(12, config.rootRadius * 0.3));
      const cutouts = MathEngine.buildCutoutPaths(
        config.cx,
        config.cy,
        config.rootRadius,
        hubRadius
      );
      cutouts.forEach((d) => {
        rotator.appendChild(
          SvgRenderer.createSvgEl('path', {
            d,
            class: 'gl-gear-cutout',
          })
        );
      });

      // Tooth / Valley labels
      const labelStep = config.teeth <= 16 ? 1 : config.teeth <= 24 ? 2 : 3;
      const labelRadius = Math.max(hubRadius + 10, config.rootRadius - 11);
      const angularStep = (2 * Math.PI) / config.teeth;

      if (labelRadius > hubRadius + 5) {
        for (let i = 0; i < config.teeth; i += 1) {
          const displayIdx = config.reverseLabelIndex
            ? (config.teeth - i) % config.teeth
            : i;
          if (displayIdx !== 0 && displayIdx % labelStep !== 0) continue;

          const angle = config.reverseLabelIndex
            ? i * angularStep
            : Math.PI + i * angularStep;
          const pos = MathEngine.polarToCartesian(
            config.cx,
            config.cy,
            labelRadius,
            angle
          );
          const lbl = SvgRenderer.createSvgEl('text', {
            x: pos.x.toFixed(2),
            y: pos.y.toFixed(2),
            class:
              displayIdx === 0
                ? 'gl-tooth-label gl-tooth-label-zero'
                : 'gl-tooth-label',
          });
          lbl.textContent = String(displayIdx);
          rotator.appendChild(lbl);
        }
      }

      // Reference marker ray & dot at Tooth/Valley 0
      const markerEnd = MathEngine.polarToCartesian(
        config.cx,
        config.cy,
        config.pitchRadius,
        config.markerAngleRad
      );
      const markerStart = MathEngine.polarToCartesian(
        config.cx,
        config.cy,
        hubRadius,
        config.markerAngleRad
      );

      rotator.appendChild(
        SvgRenderer.createSvgEl('line', {
          x1: markerStart.x.toFixed(2),
          y1: markerStart.y.toFixed(2),
          x2: markerEnd.x.toFixed(2),
          y2: markerEnd.y.toFixed(2),
          class: 'gl-marker-ray',
        })
      );

      rotator.appendChild(
        SvgRenderer.createSvgEl('circle', {
          cx: markerEnd.x.toFixed(2),
          cy: markerEnd.y.toFixed(2),
          r: Math.max(4.5, Math.min(7, config.mod * 0.45)).toFixed(2),
          class: 'gl-marker-dot',
        })
      );

      outerGroup.appendChild(rotator);

      // Fixed hub bearing & center label on top
      outerGroup.appendChild(
        SvgRenderer.createSvgEl('circle', {
          cx: config.cx.toFixed(2),
          cy: config.cy.toFixed(2),
          r: hubRadius.toFixed(2),
          class: 'gl-gear-hub',
        })
      );

      outerGroup.appendChild(
        SvgRenderer.createSvgEl('circle', {
          cx: config.cx.toFixed(2),
          cy: config.cy.toFixed(2),
          r: Math.max(4, hubRadius * 0.38).toFixed(2),
          class: 'gl-gear-axle',
        })
      );

      const centerText = SvgRenderer.createSvgEl('text', {
        x: config.cx.toFixed(2),
        y: (config.cy - hubRadius - 12).toFixed(2),
        class: 'gl-gear-center-label',
      });
      centerText.textContent = `${config.label} (${config.teeth})`;
      outerGroup.appendChild(centerText);

      return { outerGroup, rotator };
    },

    updateRotations(stageRefs, kinematics) {
      const { layout, rotatorA, rotatorB, gearAEl, gearBEl, contactZone, contactLabel } =
        stageRefs;

      rotatorA.setAttribute(
        'transform',
        `rotate(${kinematics.angleA.toFixed(3)} ${layout.cxA.toFixed(2)} ${layout.cy.toFixed(2)})`
      );
      rotatorB.setAttribute(
        'transform',
        `rotate(${kinematics.angleB.toFixed(3)} ${layout.cxB.toFixed(2)} ${layout.cy.toFixed(2)})`
      );

      gearAEl.classList.toggle('gl-is-aligned', kinematics.isAligned);
      gearBEl.classList.toggle('gl-is-aligned', kinematics.isAligned);
      contactZone.classList.toggle('gl-is-aligned', kinematics.isAligned);
      contactZone.classList.toggle('gl-is-lcm', kinematics.isAtLcm);

      if (kinematics.isAtLcm) {
        contactLabel.textContent = 'GẶP LẠI (BCNN)';
      } else if (kinematics.isAtStart) {
        contactLabel.textContent = 'Xuất phát (t = 0)';
      } else {
        contactLabel.textContent = 'Điểm tiếp xúc';
      }
    },

    renderTimeline(svgEl, analysis, maxTimelineTeeth) {
      svgEl.replaceChildren();

      const padLeft = 58;
      const padRight = 24;
      const trackWidth = TIMELINE_WIDTH - padLeft - padRight;
      const rowAY = 28;
      const rowBY = 68;
      const trackH = 12;

      const xFromTeeth = (t) => padLeft + (t / maxTimelineTeeth) * trackWidth;

      // Row labels
      const lblA = SvgRenderer.createSvgEl('text', {
        x: '8',
        y: (rowAY + 10).toFixed(1),
        class: 'gl-tl-row-label',
      });
      lblA.textContent = `A (${analysis.teethA})`;
      svgEl.appendChild(lblA);

      const lblB = SvgRenderer.createSvgEl('text', {
        x: '8',
        y: (rowBY + 10).toFixed(1),
        class: 'gl-tl-row-label',
      });
      lblB.textContent = `B (${analysis.teethB})`;
      svgEl.appendChild(lblB);

      // Track backgrounds
      svgEl.appendChild(
        SvgRenderer.createSvgEl('rect', {
          x: padLeft,
          y: rowAY,
          width: trackWidth,
          height: trackH,
          rx: '6',
          class: 'gl-tl-track-bg',
        })
      );

      svgEl.appendChild(
        SvgRenderer.createSvgEl('rect', {
          x: padLeft,
          y: rowBY,
          width: trackWidth,
          height: trackH,
          rx: '6',
          class: 'gl-tl-track-bg',
        })
      );

      // Progress fill rects
      const fillA = SvgRenderer.createSvgEl('rect', {
        id: 'gl-tl-fill-a',
        x: padLeft,
        y: rowAY,
        width: '0',
        height: trackH,
        rx: '6',
        class: 'gl-tl-track-fill-a',
      });
      svgEl.appendChild(fillA);

      const fillB = SvgRenderer.createSvgEl('rect', {
        id: 'gl-tl-fill-b',
        x: padLeft,
        y: rowBY,
        width: '0',
        height: trackH,
        rx: '6',
        class: 'gl-tl-track-fill-b',
      });
      svgEl.appendChild(fillB);

      // LCM vertical alignment guides
      for (let t = analysis.lcm; t <= maxTimelineTeeth; t += analysis.lcm) {
        const lx = xFromTeeth(t);
        svgEl.appendChild(
          SvgRenderer.createSvgEl('line', {
            x1: lx.toFixed(2),
            y1: '14',
            x2: lx.toFixed(2),
            y2: '94',
            class: 'gl-tl-tick-lcm',
          })
        );
        const lcmTxt = SvgRenderer.createSvgEl('text', {
          x: lx.toFixed(2),
          y: '108',
          class: 'gl-tl-tick-label gl-tl-tick-label-lcm',
        });
        lcmTxt.textContent = `${t}`;
        svgEl.appendChild(lcmTxt);
      }

      // Multiples ticks for Gear A
      const countA = Math.floor(maxTimelineTeeth / analysis.teethA);
      const labelStepA = Math.max(1, Math.ceil(countA / 10));
      for (let k = 0; k <= countA; k += 1) {
        const t = k * analysis.teethA;
        const tx = xFromTeeth(t);
        const isLcm = t > 0 && t % analysis.lcm === 0;
        svgEl.appendChild(
          SvgRenderer.createSvgEl('line', {
            x1: tx.toFixed(2),
            y1: (rowAY - 4).toFixed(2),
            x2: tx.toFixed(2),
            y2: (rowAY + trackH + 4).toFixed(2),
            class: 'gl-tl-tick-a',
          })
        );
        svgEl.appendChild(
          SvgRenderer.createSvgEl('circle', {
            cx: tx.toFixed(2),
            cy: (rowAY + trackH / 2).toFixed(2),
            r: isLcm ? '5' : '3.5',
            class: isLcm ? 'gl-tl-dot-lcm' : 'gl-tl-dot-a',
          })
        );
        if (k > 0 && !isLcm && k % labelStepA === 0) {
          const txt = SvgRenderer.createSvgEl('text', {
            x: tx.toFixed(2),
            y: (rowAY - 9).toFixed(2),
            class: 'gl-tl-tick-label',
          });
          txt.textContent = String(t);
          svgEl.appendChild(txt);
        }
      }

      // Multiples ticks for Gear B
      const countB = Math.floor(maxTimelineTeeth / analysis.teethB);
      const labelStepB = Math.max(1, Math.ceil(countB / 10));
      for (let k = 0; k <= countB; k += 1) {
        const t = k * analysis.teethB;
        const tx = xFromTeeth(t);
        const isLcm = t > 0 && t % analysis.lcm === 0;
        svgEl.appendChild(
          SvgRenderer.createSvgEl('line', {
            x1: tx.toFixed(2),
            y1: (rowBY - 4).toFixed(2),
            x2: tx.toFixed(2),
            y2: (rowBY + trackH + 4).toFixed(2),
            class: 'gl-tl-tick-b',
          })
        );
        svgEl.appendChild(
          SvgRenderer.createSvgEl('circle', {
            cx: tx.toFixed(2),
            cy: (rowBY + trackH / 2).toFixed(2),
            r: isLcm ? '5' : '3.5',
            class: isLcm ? 'gl-tl-dot-lcm' : 'gl-tl-dot-b',
          })
        );
        if (k > 0 && !isLcm && k % labelStepB === 0) {
          const txt = SvgRenderer.createSvgEl('text', {
            x: tx.toFixed(2),
            y: (rowBY + trackH + 17).toFixed(2),
            class: 'gl-tl-tick-label',
          });
          txt.textContent = String(t);
          svgEl.appendChild(txt);
        }
      }

      // Moving playhead cursor
      const cursorLine = SvgRenderer.createSvgEl('line', {
        id: 'gl-tl-cursor',
        x1: padLeft,
        y1: '14',
        x2: padLeft,
        y2: '94',
        class: 'gl-tl-cursor',
      });
      svgEl.appendChild(cursorLine);

      const cursorHead = SvgRenderer.createSvgEl('polygon', {
        id: 'gl-tl-cursor-head',
        points: `${padLeft - 5},8 ${padLeft + 5},8 ${padLeft},15`,
        class: 'gl-tl-cursor-head',
      });
      svgEl.appendChild(cursorHead);

      return {
        padLeft,
        trackWidth,
        maxTimelineTeeth,
        fillA,
        fillB,
        cursorLine,
        cursorHead,
      };
    },

    updateTimelineCursor(tlRefs, teethMeshed) {
      const clamped = Math.max(0, Math.min(teethMeshed, tlRefs.maxTimelineTeeth));
      const ratio = clamped / tlRefs.maxTimelineTeeth;
      const fillW = ratio * tlRefs.trackWidth;
      const cx = tlRefs.padLeft + fillW;

      tlRefs.fillA.setAttribute('width', fillW.toFixed(2));
      tlRefs.fillB.setAttribute('width', fillW.toFixed(2));
      tlRefs.cursorLine.setAttribute('x1', cx.toFixed(2));
      tlRefs.cursorLine.setAttribute('x2', cx.toFixed(2));
      tlRefs.cursorHead.setAttribute(
        'points',
        `${(cx - 5).toFixed(2)},8 ${(cx + 5).toFixed(2)},8 ${cx.toFixed(2)},15`
      );
    },
  };

  /* =========================================================================
   * 3. ĐIỀU KHIỂN TRẠNG THÁI & GIAO DIỆN (App Controller)
   * ========================================================================= */
  function initApp() {
    const dom = {
      svgFrame: document.getElementById('gl-svg-frame'),
      axisLayer: document.getElementById('gl-svg-axis-layer'),
      gearsLayer: document.getElementById('gl-svg-gears-layer'),
      contactLayer: document.getElementById('gl-svg-contact-layer'),
      timelineSvg: document.getElementById('gl-timeline-svg'),
      statusBanner: document.getElementById('gl-status-banner'),
      statusIcon: document.getElementById('gl-status-icon'),
      statusText: document.getElementById('gl-status-text'),
      meshedCounter: document.getElementById('gl-meshed-counter'),
      legendA: document.getElementById('gl-legend-a'),
      legendB: document.getElementById('gl-legend-b'),
      cycleMeta: document.getElementById('gl-cycle-meta'),
      scrubber: document.getElementById('gl-timeline-scrubber'),
      scrubberMid: document.getElementById('gl-scrubber-mid'),
      scrubberMax: document.getElementById('gl-scrubber-max'),
      sliderA: document.getElementById('gl-slider-a'),
      sliderB: document.getElementById('gl-slider-b'),
      valueA: document.getElementById('gl-value-a'),
      valueB: document.getElementById('gl-value-b'),
      decA: document.getElementById('gl-dec-a'),
      incA: document.getElementById('gl-inc-a'),
      decB: document.getElementById('gl-dec-b'),
      incB: document.getElementById('gl-inc-b'),
      playBtn: document.getElementById('gl-play-btn'),
      playLabel: document.getElementById('gl-play-label'),
      playIcon: document.getElementById('gl-play-icon'),
      resetBtn: document.getElementById('gl-reset-btn'),
      stepBackBtn: document.getElementById('gl-step-back-btn'),
      stepFwdBtn: document.getElementById('gl-step-fwd-btn'),
      stepRevABtn: document.getElementById('gl-step-rev-a-btn'),
      jumpLcmBtn: document.getElementById('gl-jump-lcm-btn'),
      speedGroup: document.getElementById('gl-speed-segmented'),
      autoStopToggle: document.getElementById('gl-autostop-toggle'),
      presetButtons: document.getElementById('gl-preset-buttons'),
      revsA: document.getElementById('gl-revs-a'),
      revsB: document.getElementById('gl-revs-b'),
      targetRevsA: document.getElementById('gl-target-revs-a'),
      targetRevsB: document.getElementById('gl-target-revs-b'),
      angleA: document.getElementById('gl-angle-a'),
      angleB: document.getElementById('gl-angle-b'),
      mathLcm: document.getElementById('gl-math-lcm'),
      mathGcd: document.getElementById('gl-math-gcd'),
      mathRatio: document.getElementById('gl-math-ratio'),
      mathFactors: document.getElementById('gl-math-factors'),
      mathFormula: document.getElementById('gl-math-formula'),
      mathCycles: document.getElementById('gl-math-cycles'),
      mathMultiples: document.getElementById('gl-math-multiples'),
    };

    const state = {
      teethA: 12,
      teethB: 18,
      teethMeshed: 0,
      speedMultiplier: 1,
      autoStopAtLcm: true,
      isPlaying: false,
      rafId: null,
      lastTimestamp: 0,
      maxTimelineTeeth: 36,
      analysis: null,
      stageRefs: null,
      timelineRefs: null,
    };

    function formatMultiplesPreview(list, lcmVal) {
      if (list.length <= 5) {
        return list.join(', ');
      }
      return `${list.slice(0, 3).join(', ')}, …, ${lcmVal}`;
    }

    function updatePlayButtonUi() {
      dom.playBtn.classList.toggle('gl-is-playing', state.isPlaying);
      dom.playLabel.textContent = state.isPlaying ? 'Tạm dừng' : 'Chạy mô phỏng';
      dom.playIcon.replaceChildren();
      if (state.isPlaying) {
        dom.playIcon.appendChild(
          SvgRenderer.createSvgEl('path', {
            d: 'M5.5 4.5A1 1 0 0 1 6.5 3.5h2a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-11Zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-11Z',
          })
        );
      } else {
        dom.playIcon.appendChild(
          SvgRenderer.createSvgEl('path', {
            d: 'M6.3 4.1A1 1 0 0 0 5 5v10a1 1 0 0 0 1.5.86l8.5-5a1 1 0 0 0 0-1.72l-8.5-5Z',
          })
        );
      }
    }

    function syncPresetButtons() {
      const buttons = dom.presetButtons.querySelectorAll('.gl-preset-btn');
      buttons.forEach((btn) => {
        const a = Number(btn.getAttribute('data-a'));
        const b = Number(btn.getAttribute('data-b'));
        btn.classList.toggle('gl-is-active', a === state.teethA && b === state.teethB);
      });
    }

    function rebuildGeometryAndAnalysis() {
      state.analysis = MathEngine.computeGearAnalysis(state.teethA, state.teethB);
      const lcmVal = state.analysis.lcm;
      state.maxTimelineTeeth = state.autoStopAtLcm ? lcmVal : Math.max(lcmVal, lcmVal * 2);

      dom.sliderA.value = String(state.teethA);
      dom.sliderB.value = String(state.teethB);
      dom.valueA.textContent = `${state.teethA} răng`;
      dom.valueB.textContent = `${state.teethB} răng`;
      dom.decA.disabled = state.teethA <= MIN_TEETH;
      dom.incA.disabled = state.teethA >= MAX_TEETH;
      dom.decB.disabled = state.teethB <= MIN_TEETH;
      dom.incB.disabled = state.teethB >= MAX_TEETH;

      dom.legendA.textContent = `Bánh răng A (${state.teethA} răng) — quay thuận chiều KĐH`;
      dom.legendB.textContent = `Bánh răng B (${state.teethB} răng) — quay ngược chiều KĐH`;
      dom.cycleMeta.textContent = `Chu kỳ BCNN: ${lcmVal} răng`;

      dom.scrubber.max = String(state.maxTimelineTeeth);
      dom.scrubberMid.textContent = `${Math.round(state.maxTimelineTeeth / 2)} răng`;
      dom.scrubberMax.textContent =
        state.maxTimelineTeeth === lcmVal
          ? `${lcmVal} răng (BCNN)`
          : `${state.maxTimelineTeeth} răng (2×BCNN)`;

      dom.targetRevsA.textContent = `Gặp lại sau ${state.analysis.revsAForLcm} vòng`;
      dom.targetRevsB.textContent = `Gặp lại sau ${state.analysis.revsBForLcm} vòng`;

      dom.mathLcm.textContent = String(lcmVal);
      dom.mathGcd.textContent = String(state.analysis.gcd);
      dom.mathRatio.textContent = `Tỉ số ${state.analysis.ratioA} : ${state.analysis.ratioB}`;
      dom.mathFactors.textContent = `${state.teethA} = ${state.analysis.factorsA}  ·  ${state.teethB} = ${state.analysis.factorsB}`;
      dom.mathFormula.textContent = `(${state.teethA} × ${state.teethB}) ÷ ${state.analysis.gcd} = ${lcmVal}`;
      dom.mathCycles.textContent = `A: ${lcmVal} ÷ ${state.teethA} = ${state.analysis.revsAForLcm} vòng  ·  B: ${lcmVal} ÷ ${state.teethB} = ${state.analysis.revsBForLcm} vòng`;
      dom.mathMultiples.textContent = `B(${state.teethA}): {${formatMultiplesPreview(
        state.analysis.multiplesA,
        lcmVal
      )}}  |  B(${state.teethB}): {${formatMultiplesPreview(
        state.analysis.multiplesB,
        lcmVal
      )}}`;

      state.stageRefs = SvgRenderer.renderStage(dom, state);
      state.timelineRefs = SvgRenderer.renderTimeline(
        dom.timelineSvg,
        state.analysis,
        state.maxTimelineTeeth
      );
      syncPresetButtons();
      renderDynamicFrame();
    }

    function renderDynamicFrame() {
      const kin = MathEngine.computeKinematics(
        state.teethA,
        state.teethB,
        state.teethMeshed,
        state.analysis.lcm
      );

      SvgRenderer.updateRotations(state.stageRefs, kin);
      SvgRenderer.updateTimelineCursor(state.timelineRefs, state.teethMeshed);

      dom.svgFrame.classList.toggle('gl-is-lcm-aligned', kin.isAtLcm);

      dom.statusBanner.classList.remove(
        'gl-status-start',
        'gl-status-running',
        'gl-status-aligned'
      );

      if (kin.isAtLcm) {
        dom.statusBanner.classList.add('gl-status-aligned');
        dom.statusIcon.textContent = '✓';
        const multText =
          kin.lcmMultipleIndex > 1
            ? `Gặp lại lần ${kin.lcmMultipleIndex} (${kin.lcmMultipleIndex * state.analysis.lcm} răng)`
            : `Đã gặp lại tại BCNN = ${state.analysis.lcm} răng`;
        dom.statusText.textContent = `${multText} — Bánh A quay ${kin.revsA.toFixed(
          0
        )} vòng, Bánh B quay ${kin.revsB.toFixed(0)} vòng`;
      } else if (kin.isAtStart) {
        dom.statusBanner.classList.add('gl-status-start');
        dom.statusIcon.textContent = '●';
        dom.statusText.textContent =
          'Điểm xuất phát — Hai dấu chuẩn gặp nhau tại điểm tiếp xúc';
      } else {
        dom.statusBanner.classList.add('gl-status-running');
        dom.statusIcon.textContent = '↻';
        dom.statusText.textContent = state.isPlaying
          ? 'Đang quay ăn khớp…'
          : 'Đang tạm dừng giữa chu kỳ';
      }

      const displayMeshed = Number.isInteger(state.teethMeshed)
        ? String(state.teethMeshed)
        : state.teethMeshed.toFixed(1);
      dom.meshedCounter.textContent = `${displayMeshed} / ${state.analysis.lcm} răng`;

      dom.revsA.textContent = `${kin.revsA.toFixed(2)} vòng`;
      dom.revsB.textContent = `${kin.revsB.toFixed(2)} vòng`;
      dom.angleA.textContent = `+${Math.round(kin.angleA)}°`;
      dom.angleB.textContent = `${Math.round(kin.angleB)}°`;

      if (document.activeElement !== dom.scrubber) {
        dom.scrubber.value = String(
          Math.min(state.teethMeshed, state.maxTimelineTeeth)
        );
      }
    }

    function stopPlayback() {
      state.isPlaying = false;
      if (state.rafId !== null) {
        cancelAnimationFrame(state.rafId);
        state.rafId = null;
      }
      updatePlayButtonUi();
      renderDynamicFrame();
    }

    function tickAnimation(timestamp) {
      if (!state.isPlaying) return;
      if (state.lastTimestamp === 0) {
        state.lastTimestamp = timestamp;
      }
      const dtSec = Math.min(0.05, (timestamp - state.lastTimestamp) / 1000);
      state.lastTimestamp = timestamp;

      const baseTeethPerSec = Math.max(
        6,
        Math.min(24, state.analysis.lcm / 8)
      );
      const deltaTeeth = baseTeethPerSec * state.speedMultiplier * dtSec;
      const prevTeeth = state.teethMeshed;
      const nextTeeth = prevTeeth + deltaTeeth;

      const lcmVal = state.analysis.lcm;
      const prevCycle = Math.floor((prevTeeth + 0.0001) / lcmVal);
      const nextCycle = Math.floor((nextTeeth + 0.0001) / lcmVal);

      if (state.autoStopAtLcm && nextCycle > prevCycle && nextCycle >= 1) {
        state.teethMeshed = nextCycle * lcmVal;
        stopPlayback();
        return;
      }

      if (!state.autoStopAtLcm && nextTeeth >= state.maxTimelineTeeth) {
        state.teethMeshed = nextTeeth % state.maxTimelineTeeth;
      } else {
        state.teethMeshed = nextTeeth;
      }

      renderDynamicFrame();
      state.rafId = requestAnimationFrame(tickAnimation);
    }

    function startPlayback() {
      if (
        state.autoStopAtLcm &&
        Math.abs(state.teethMeshed - state.analysis.lcm) < 0.05
      ) {
        state.teethMeshed = 0;
      }
      state.isPlaying = true;
      state.lastTimestamp = 0;
      updatePlayButtonUi();
      renderDynamicFrame();
      state.rafId = requestAnimationFrame(tickAnimation);
    }

    function applyToothChange(nextA, nextB) {
      stopPlayback();
      state.teethA = Math.max(MIN_TEETH, Math.min(MAX_TEETH, Math.round(nextA)));
      state.teethB = Math.max(MIN_TEETH, Math.min(MAX_TEETH, Math.round(nextB)));
      state.teethMeshed = 0;
      rebuildGeometryAndAnalysis();
    }

    function stepByTeeth(delta) {
      stopPlayback();
      const nextVal = Math.max(
        0,
        Math.min(state.maxTimelineTeeth, Math.round((state.teethMeshed + delta) * 100) / 100)
      );
      state.teethMeshed = nextVal;
      renderDynamicFrame();
    }

    /* Event Listeners */
    dom.sliderA.addEventListener('input', (e) => {
      applyToothChange(Number(e.target.value), state.teethB);
    });

    dom.sliderB.addEventListener('input', (e) => {
      applyToothChange(state.teethA, Number(e.target.value));
    });

    dom.decA.addEventListener('click', () => {
      applyToothChange(state.teethA - 1, state.teethB);
    });

    dom.incA.addEventListener('click', () => {
      applyToothChange(state.teethA + 1, state.teethB);
    });

    dom.decB.addEventListener('click', () => {
      applyToothChange(state.teethA, state.teethB - 1);
    });

    dom.incB.addEventListener('click', () => {
      applyToothChange(state.teethA, state.teethB + 1);
    });

    dom.presetButtons.addEventListener('click', (e) => {
      const btn = e.target.closest('.gl-preset-btn');
      if (!btn) return;
      const a = Number(btn.getAttribute('data-a'));
      const b = Number(btn.getAttribute('data-b'));
      if (Number.isFinite(a) && Number.isFinite(b)) {
        applyToothChange(a, b);
      }
    });

    dom.playBtn.addEventListener('click', () => {
      if (state.isPlaying) {
        stopPlayback();
      } else {
        startPlayback();
      }
    });

    dom.resetBtn.addEventListener('click', () => {
      stopPlayback();
      state.teethMeshed = 0;
      renderDynamicFrame();
    });

    dom.stepBackBtn.addEventListener('click', () => {
      stepByTeeth(-1);
    });

    dom.stepFwdBtn.addEventListener('click', () => {
      stepByTeeth(1);
    });

    dom.stepRevABtn.addEventListener('click', () => {
      stepByTeeth(state.teethA);
    });

    dom.jumpLcmBtn.addEventListener('click', () => {
      stopPlayback();
      state.teethMeshed = state.analysis.lcm;
      renderDynamicFrame();
    });

    dom.scrubber.addEventListener('input', (e) => {
      if (state.isPlaying) {
        stopPlayback();
      }
      const rawVal = Number(e.target.value);
      const lcmVal = state.analysis.lcm;
      if (Math.abs(rawVal - lcmVal) < 0.25) {
        state.teethMeshed = lcmVal;
      } else if (rawVal < 0.15) {
        state.teethMeshed = 0;
      } else {
        state.teethMeshed = rawVal;
      }
      renderDynamicFrame();
    });

    dom.speedGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.gl-seg-btn');
      if (!btn) return;
      const spd = Number(btn.getAttribute('data-speed'));
      if (!Number.isFinite(spd)) return;
      state.speedMultiplier = spd;
      dom.speedGroup.querySelectorAll('.gl-seg-btn').forEach((item) => {
        item.classList.toggle('gl-is-active', item === btn);
      });
    });

    dom.autoStopToggle.addEventListener('change', (e) => {
      state.autoStopAtLcm = Boolean(e.target.checked);
      const prevMeshed = state.teethMeshed;
      rebuildGeometryAndAnalysis();
      state.teethMeshed = Math.min(prevMeshed, state.maxTimelineTeeth);
      renderDynamicFrame();
    });

    rebuildGeometryAndAnalysis();
  }

  document.addEventListener('DOMContentLoaded', initApp);
})();
