import { useAppStore } from '../store/appStore';

export default function TimeControlDial() {
    const { isPlaying, speed, timeValue, togglePlaying, cycleSpeed, setTimeValue } = useAppStore();

    return (
        <div className="controls-panel">
            <button className={`control-btn ${isPlaying ? 'active' : ''}`} onClick={togglePlaying} title={isPlaying ? '일시정지' : '재생'}>
                {isPlaying ? '⏸' : '▶'}
            </button>

            <button className="control-btn" onClick={cycleSpeed} title="배속 변경">
                <span className="speed-label">×{speed}</span>
            </button>

            <div className="slider-container">
                <input
                    type="range"
                    className="slider-input"
                    min={0}
                    max={1}
                    step={0.001}
                    value={timeValue}
                    onChange={(e) => setTimeValue(parseFloat(e.target.value))}
                    title="시간 조절"
                />
                <span className="slider-label">시간 조절</span>
            </div>
        </div>
    );
}
