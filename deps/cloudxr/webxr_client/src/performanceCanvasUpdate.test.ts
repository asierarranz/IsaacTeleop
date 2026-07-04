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

import {
  getPerformanceCanvasUpdate,
  PERFORMANCE_CANVAS_UPDATE_INTERVAL_MS,
  PerformanceCanvasValues,
} from '../helpers/react/performanceCanvasUpdate';

const values = (
  renderFps = '72.0',
  streamingFps = '71.9',
  poseToRender = '12.3ms'
): PerformanceCanvasValues => [renderFps, streamingFps, poseToRender];

describe('getPerformanceCanvasUpdate', () => {
  it('draws the first values immediately', () => {
    const firstValues = values();

    const update = getPerformanceCanvasUpdate(0, firstValues, null);

    expect(update).toEqual({ drawnAtMs: 0, values: firstValues });
  });

  it('skips an update when all metric strings are unchanged', () => {
    const previous = getPerformanceCanvasUpdate(0, values(), null);

    const update = getPerformanceCanvasUpdate(
      PERFORMANCE_CANVAS_UPDATE_INTERVAL_MS,
      values(),
      previous
    );

    expect(update).toBe(previous);
  });

  it('holds changed values until the update interval has elapsed', () => {
    const previous = getPerformanceCanvasUpdate(0, values(), null);

    const update = getPerformanceCanvasUpdate(
      PERFORMANCE_CANVAS_UPDATE_INTERVAL_MS - 1,
      values('73.0'),
      previous
    );

    expect(update).toBe(previous);
  });

  it('coalesces changes by drawing the latest values when the interval elapses', () => {
    const previous = getPerformanceCanvasUpdate(0, values(), null);
    const intermediate = getPerformanceCanvasUpdate(25, values('73.0'), previous);
    const latestValues = values('74.0', '73.8', '11.8ms');

    const update = getPerformanceCanvasUpdate(
      PERFORMANCE_CANVAS_UPDATE_INTERVAL_MS,
      latestValues,
      intermediate
    );

    expect(intermediate).toBe(previous);
    expect(update).not.toBe(previous);
    expect(update).toEqual({
      drawnAtMs: PERFORMANCE_CANVAS_UPDATE_INTERVAL_MS,
      values: latestValues,
    });
  });

  it('starts the next interval from the latest draw', () => {
    const first = getPerformanceCanvasUpdate(0, values(), null);
    const second = getPerformanceCanvasUpdate(
      PERFORMANCE_CANVAS_UPDATE_INTERVAL_MS,
      values('73.0'),
      first
    );

    const tooSoon = getPerformanceCanvasUpdate(
      PERFORMANCE_CANVAS_UPDATE_INTERVAL_MS * 2 - 1,
      values('74.0'),
      second
    );
    const eligible = getPerformanceCanvasUpdate(
      PERFORMANCE_CANVAS_UPDATE_INTERVAL_MS * 2,
      values('74.0'),
      tooSoon
    );

    expect(tooSoon).toBe(second);
    expect(eligible).not.toBe(second);
  });
});
