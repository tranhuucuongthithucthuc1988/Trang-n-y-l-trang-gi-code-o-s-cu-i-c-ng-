/* =====================================================
   VIDEO VAULT — Dữ liệu phim ẩn (URL tách mảnh)
   Không có full URL string nào trong file này
   ===================================================== */
(function () {
    'use strict';

    const FB     = 'https://res.cloudinary.com/l5czhek5/image/upload/v1788314155/62a6b656-186e-4a3f-94d0-e2e2bce51033.jpg';
    const CDN    = 'https://res.' + 'cloudinary.com';
    const FEMBED = 'https://fembed.co/embed/';
    const YT     = 'https://www.youtube.com/embed/';
    const YTN    = 'https://www.youtube-nocookie.com/embed/';

    // [id, kind, host, ts, file, title, desc, thumb, isNew]
    const _R = [
        [1,  'mp4', 'mr29tktx', 'v1783526960', 'T%E1%BA%ADp_1_dyuezj.mp4', 'Đạo sĩ cuối cùng - Tập 1', 'Hành trình diệt ma cứu thế.'],
        [2,  'mp4', 'mr29tktx', 'v1783526996', 'T%E1%BA%ADp_3_ghizqf.mp4', 'Đạo sĩ cuối cùng - Tập 3', 'Tiếp tục cuộc chiến.'],
        [3,  'mp4', 'mr29tktx', 'v1783526979', 't%E1%BA%ADp_5_z0gcgp.mp4', 'Đạo sĩ cuối cùng - Tập 5', 'Bí ẩn được hé lộ.'],
        [4,  'mp4', 'mr29tktx', 'v1783526963', 'T%E1%BA%ADp_6_qygylw.mp4', 'Đạo sĩ cuối cùng - Tập 6', 'Hiểm họa cận kề.'],
        [5,  'mp4', 'mr29tktx', 'v1783526994', 'T%E1%BA%ADp_7_atzegm.mp4', 'Đạo sĩ cuối cùng - Tập 7', 'Cuộc thanh trừng.'],
        [6,  'mp4', 'mr29tktx', 'v1783526945', 'T%E1%BA%ADp_8_hdja89.mp4', 'Đạo sĩ cuối cùng - Tập 8', 'Sự thật về thi biến.'],
        [7,  'mp4', 'mr29tktx', 'v1783526951', 'T%E1%BA%ADp_10_ph%E1%BA%A7n_1_ojaybx.mp4', 'Đạo sĩ cuối cùng - Tập 10 phần 1', 'Trận chiến cao trào.'],
        [8,  'mp4', 'mr29tktx', 'v1783526956', 'T%E1%BA%ADp_10_ph%E1%BA%A7n_2_esorbm.mp4', 'Đạo sĩ cuối cùng - Tập 10 phần 2', 'Hồi kết phần đầu.'],
        [9,  'mp4', 'l5czhek5', 'v1788278676', '%C4%90%E1%BA%A1o_s%C4%A9_cu%E1%BB%91i_c%C3%B9ng_t%E1%BA%ADp_11.mp4', 'Đạo sĩ cuối cùng - Tập 11', 'Nguồn gốc mới.'],
        [10, 'mp4', 'l5czhek5', 'v1788252998', 'T%E1%BA%ADp_12.mp4', 'Đạo sĩ cuối cùng - Tập 12', 'Kết thúc hay khởi đầu?'],
        [32, 'fb',  '', '', 'fpY-Y4_Za9Qz1', 'Tập gì đó phần 1', '🔥 Tập mới cập nhật — phần 1.', '', true],
        [33, 'fb',  '', '', 'fVe_UW-MrqKRw', 'Phim Cương Thi Thúc Thúc 1988', 'Phim Cương Thi Thúc Thúc 1988', 'https://res.cloudinary.com/l5czhek5/image/upload/v1794017283/Images.png', true],
        [34, 'fb',  '', '', 'cRwiRk-ja_Tsm', 'Đạo Sĩ Cuối Cùng tập 7 edit', '🔥 Đạo Sĩ Cuối Cùng tập 7 edit.', '', true],
        [11, 'mp4', 'mr29tktx', 'v1783526991', 'Thi%C3%AAn_s%E1%BB%A9_b%E1%BA%AFt_ma_ph%E1%BA%A7n_1_wqmhgb.mp4', 'Thiên sứ bắt ma phần 1', 'Hành trình diệt ma.'],
        [12, 'mp4', 'mr29tktx', 'v1783526974', 'Thi%C3%AAn_s%E1%BB%A9_b%E1%BA%AFt_ma_ph%E1%BA%A7n_2_nbpbs3.mp4', 'Thiên sứ bắt ma phần 2', 'Phần tiếp theo.'],
        [13, 'mp4', 'mr29tktx', 'v1783526985', 'Thi%C3%AAn_s%E1%BB%A9_b%E1%BA%AFt_ma_ph%E1%BA%A7n_3_rhfl9a.mp4', 'Thiên sứ bắt ma phần 3', 'Hồi kết.'],
        [14, 'yt',  '', '', 'x6J7ji8VBpA', 'Rigor Mortis (2013)', 'Siêu phẩm ma quỷ hiện đại.'],
        [15, 'yt',  '', '', 'W_OaT4p-GcU', 'Full bộ Thiên sứ bắt ma phần 1', 'Đặc cảnh diệt ma.'],
        [16, 'yt',  '', '', 'G1KHvVcwgOQ', 'Đặc cảnh diệt ma', 'Hành động cương thi.'],
        [17, 'yt',  '', '', 'T6tGDRCYykE', 'Video cương thi 1', ''],
        [18, 'yt',  '', '', 'I4Zx_fZmMmM', 'Video cương thi 2', ''],
        [19, 'yt',  '', '', 'iTa2ZTmMPX4', 'Video cương thi 3', ''],
        [20, 'yt',  '', '', 'lcmSfOnUcXk', 'Video cương thi 4', ''],
        [21, 'yt',  '', '', 'WHdr0EGIRIc', 'Video cương thi 5', ''],
        [22, 'yt',  '', '', 'Dflmu6PCZeg', 'Video cương thi 6', ''],
        [23, 'yt',  '', '', '8xuMYS7EsKk', 'Video cương thi 7', ''],
        [24, 'yt',  '', '', '7TVTYFoWUio', 'Video cương thi 8', ''],
        [25, 'yt',  '', '', '7ui9Y-uiOv8', 'Video cương thi 9', ''],
        [26, 'yt',  '', '', 'd8aMIrapzgM', 'Video cương thi 10', ''],
        [27, 'yt',  '', '', 'KNBdW4Vkbkc', 'Video cương thi 11', ''],
        [28, 'yt',  '', '', 'vmwVYa0HTLk', 'Khử ma đạo trưởng (Full)', 'Lâm Chánh Anh tuyệt đỉnh.'],
        [29, 'ytn', '', '', 'sNchA7Wf4zk', 'When Fortune Smiles (1990)', 'Vô Địch Vận Hanh Tinh.'],
        [30, 'yt',  '', '', 'XN_ALfbkB2M', 'Video cương thi bonus', 'Bonus.'],
        [31, 'ytn', '', '', 'PVGj1N-871Y', 'Long hổ đặc cảnh', 'Mãnh Long Đặc Cảnh.']
    ];

    function _url(kind, host, ts, file) {
        switch (kind) {
            case 'mp4': return CDN + '/' + host + '/video/upload/' + ts + '/' + file;
            case 'fb':  return FEMBED + file;
            case 'yt':  return YT + file;
            case 'ytn': return YTN + file;
        }
        return '';
    }

    window.__MOVIE_DB = _R.map(function (r) {
        const kind = r[1];
        const fallbackThumb = (kind === 'mp4' || kind === 'fb') ? FB : null;
        return {
            id:    r[0],
            type:  kind === 'mp4' ? 'mp4' : 'youtube',
            url:   _url(kind, r[2], r[3], r[4]),
            title: r[5],
            desc:  r[6] || '',
            thumb: r[7] || fallbackThumb,
            isNew: !!r[8]
        };
    });

    window.__VAULT_FB = FB;
    console.log('✅ Video vault loaded —', window.__MOVIE_DB.length, 'entries (URLs obfuscated)');
})();