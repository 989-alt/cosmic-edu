export interface EclipseTypeData {
    id: string;
    type: 'solar' | 'lunar';
    name: string;
    nameEn: string;
    description: string;
    condition: string;
}

export const eclipseTypes: EclipseTypeData[] = [
    {
        id: 'total-solar',
        type: 'solar',
        name: '개기일식',
        nameEn: 'Total Solar Eclipse',
        description: '달이 태양을 완전히 가려 태양의 코로나만 보이는 현상입니다. 낮인데도 하늘이 어두워집니다.',
        condition: '달이 태양과 지구 사이에 정확히 일직선으로 위치할 때 발생합니다.',
    },
    {
        id: 'partial-solar',
        type: 'solar',
        name: '부분일식',
        nameEn: 'Partial Solar Eclipse',
        description: '달이 태양의 일부분만 가리는 현상입니다.',
        condition: '달이 태양을 완전히 가리지 못하고 일부만 가릴 때 발생합니다.',
    },
    {
        id: 'annular-solar',
        type: 'solar',
        name: '금환일식',
        nameEn: 'Annular Solar Eclipse',
        description: '달이 태양보다 작아 보여서 태양의 가장자리가 반지(금환)처럼 빛나는 현상입니다.',
        condition: '달이 원일점(가장 먼 거리)에 있을 때, 달이 태양을 완전히 가리지 못해 발생합니다.',
    },
    {
        id: 'total-lunar',
        type: 'lunar',
        name: '개기월식',
        nameEn: 'Total Lunar Eclipse',
        description: '지구의 본그림자가 달 전체를 덮어 달이 붉게 보이는 현상(블러드문)입니다.',
        condition: '보름달일 때 달이 지구의 본그림자(Umbra) 안으로 완전히 들어갈 때 발생합니다.',
    },
    {
        id: 'partial-lunar',
        type: 'lunar',
        name: '부분월식',
        nameEn: 'Partial Lunar Eclipse',
        description: '달의 일부분만 지구의 그림자에 가려지는 현상입니다.',
        condition: '달이 지구의 본그림자 가장자리를 지나갈 때 발생합니다.',
    },
];

export const eclipseEducation = {
    whyNotEveryMonth: '달의 궤도면은 지구의 공전면(황도면)에 대해 약 5.14° 기울어져 있습니다. ' +
        '그래서 매달 삭(신월)과 망(보름달)이 되어도, 대부분 달이 태양-지구 일직선에서 약간 벗어나 있어 식(Eclipse)이 일어나지 않습니다. ' +
        '달의 궤도가 황도면과 만나는 지점(교점) 근처에서 삭 또는 망이 될 때만 일식이나 월식이 발생합니다.',
    umbraDescription: '본그림자(Umbra): 빛이 완전히 차단되는 어두운 원뿔 모양의 그림자입니다.',
    penumbraDescription: '반그림자(Penumbra): 빛이 부분적으로 차단되어 약간 어두운 영역입니다.',
};
