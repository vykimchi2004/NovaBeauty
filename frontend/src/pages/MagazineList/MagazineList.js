import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './MagazineList.module.scss';
import { getActiveBanners } from '~/services/banner';

const cx = classNames.bind(styles);

const MagazineList = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const banners = await getActiveBanners();
                const mags = (banners || []).filter(
                    (b) => b.isMagazine === true && b.status === true && !!b.imageUrl
                );
                setItems(mags);
            } catch (error) {
                console.error('[MagazineList] failed to load magazines', error);
                setItems([]);
            } finally {
                setLoading(false);
            }
        };

        load();
        window.scrollTo(0, 0);
    }, []);

    const stripHtml = (html) => {
        return html?.replace(/<[^>]*>?/gm, '') || '';
    };

    if (loading) {
        return (
            <div className={cx('loading')}>
                <div className={cx('spinner')}></div>
                <p>Đang tải danh sách bài viết...</p>
            </div>
        );
    }

    return (
        <div className={cx('wrapper')}>
            <div className={cx('container')}>
                <nav className={cx('breadcrumb')}>
                    <Link to="/">Trang chủ</Link>
                    <span>/</span>
                    <span className={cx('current')}>Tạp chí làm đẹp</span>
                </nav>

                <header className={cx('header')}>
                    <h1 className={cx('title')}>TẤT CẢ BÀI VIẾT</h1>
                </header>

                <div className={cx('cards')}>
                    {items.map((it) => (
                        <article key={it.id} className={cx('card')}>
                            <Link className={cx('thumb')} to={`/magazine/${it.id}`}>
                                <div className={cx('imageWrap')}>
                                    <div className={cx('image')} style={{ backgroundImage: `url(${it.imageUrl})` }} />
                                </div>
                            </Link>
                            <div className={cx('body')}>
                                {it.category && <span className={cx('categoryTag')}>{it.category}</span>}
                                <h3 className={cx('titleCard')}>
                                    <Link to={`/magazine/${it.id}`}>
                                        {it.title}
                                    </Link>
                                </h3>
                                <p className={cx('desc')}>
                                    {stripHtml(it.description).length > 150
                                        ? `${stripHtml(it.description).substring(0, 150)}...`
                                        : stripHtml(it.description)}
                                </p>
                            </div>
                        </article>
                    ))}
                </div>

                {items.length === 0 && (
                    <div className={cx('empty')}>
                        <p>Hiện chưa có bài viết nào.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MagazineList;
