import './AboutModal.css';
import { Telescope, X } from 'lucide-react';

interface AboutModalProps {
    onClose: () => void;
}

export default function AboutModal({ onClose }: AboutModalProps) {
    return (
        <div className="about-modal-overlay" onClick={onClose}>
            <div className="about-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="about-close-btn" onClick={onClose} aria-label="닫기"><X size={20} /></button>
                <h2><Telescope size={22} style={{ verticalAlign: '-4px', marginRight: 8 }} />COSMIC-EDU</h2>
                <p className="about-version">버전 1.0.0</p>

                <div className="about-section">
                    <h3>크레딧 & 라이선스 (Credits & Licenses)</h3>

                    <div className="credit-item">
                        <h4>천체 텍스처 (Planet Textures)</h4>
                        <p>
                            태양계의 모든 천체 이미지(지구, 달, 행성, 태양 등)와 은하수 배경은
                            <strong> Solar System Scope</strong> (Inove)에서 제공한 텍스처를 사용했습니다.
                        </p>
                        <p className="license-info">
                            <span className="badge cc-by">CC BY 4.0</span>
                            <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener noreferrer">
                                Solar System Scope Textures
                            </a>
                        </p>
                    </div>

                    <div className="credit-item">
                        <h4>지표면 텍스처 (Ground Textures)</h4>
                        <p>
                            계절의 변화 모듈에 사용된 지면 텍스처는 <strong>FreePBR</strong>의 자료를 사용했습니다.
                        </p>
                        <p className="license-info">
                            <span className="badge cc0">CC0 1.0</span>
                            <a href="https://freepbr.com/" target="_blank" rel="noopener noreferrer">
                                FreePBR
                            </a>
                        </p>
                    </div>
                </div>

                <div className="about-footer">
                    <p>이 우주 시뮬레이터는 초등 과학 교육을 위해 제작되었습니다.</p>
                </div>
            </div>
        </div>
    );
}
