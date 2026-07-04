/*
 * SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** Minimum time between canvas texture updates (10 Hz). */
export const PERFORMANCE_CANVAS_UPDATE_INTERVAL_MS = 100;

export type PerformanceCanvasValues = readonly [
  renderFps: string,
  streamingFps: string,
  poseToRender: string,
];

export interface PerformanceCanvasUpdateState {
  readonly drawnAtMs: number;
  readonly values: PerformanceCanvasValues;
}

/**
 * Return a new state when the canvas should be drawn, or the previous state when
 * the current values should be skipped. Values seen during the interval are not
 * committed, so the caller naturally draws the latest values once it is eligible.
 */
export function getPerformanceCanvasUpdate(
  nowMs: number,
  values: PerformanceCanvasValues,
  previous: PerformanceCanvasUpdateState | null
): PerformanceCanvasUpdateState {
  if (previous) {
    const valuesUnchanged = previous.values.every((value, index) => value === values[index]);
    if (valuesUnchanged || nowMs - previous.drawnAtMs < PERFORMANCE_CANVAS_UPDATE_INTERVAL_MS) {
      return previous;
    }
  }

  return { drawnAtMs: nowMs, values: [...values] };
}
