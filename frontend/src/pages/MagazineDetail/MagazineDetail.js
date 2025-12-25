import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './MagazineDetail.module.scss';
import { getBannerById, getBanners } from '~/services/banner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCalendarAlt, faUser } from '@fortawesome/free-solid-svg-icons';

const cx = classNames.bind(styles);

const MagazineDetail = () => {
    const { id } = useParams();
    const [item, setItem] = useState(null);
    const [relatedItems, setRelatedItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                setLoading(true);
                // Fetch the current article
                const data = await getBannerById(id);
                setItem(data);

                // Fetch other articles for the sidebar
                const allBanners = await getBanners();
                const magazines = allBanners.filter(
                    (b) => b.isMagazine && b.id !== id && b.isActive
                );
                // Take 5 random or latest articles
                setRelatedItems(magazines.slice(0, 5));
            } catch (error) {
                console.error('[MagazineDetail] Error fetching detail:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
        window.scrollTo(0, 0);
    }, [id]);

    if (loading) {
        return (
            <div className={cx('loading')}>
                <div className={cx('spinner')}></div>
                <p>Đang tải nội dung...</p>
            </div>
        );
    }

    if (!item) {
        return (
            <div className={cx('error')}>
                <h2>Không tìm thấy bài viết</h2>
                <Link to="/" className={cx('backHome')}>
                    Quay lại trang chủ
                </Link>
            </div>
        );
    }

    return (
        <div className={cx('wrapper')}>
            <div className={cx('breadcrumbWrapper')}>
                <div className={cx('container')}>
                    <nav className={cx('breadcrumb')}>
                        <Link to="/">Trang chủ</Link>
                        <span className={cx('divider')}>/</span>
                        <Link to="/magazines">Tạp chí</Link>
                        <span className={cx('divider')}>/</span>
                        <span className={cx('current')}>{item.category}</span>
                    </nav>
                </div>
            </div>

            <div className={cx('container')}>
                <div className={cx('layout')}>
                    <article className={cx('article')}>
                        <header className={cx('header')}>
                            <div className={cx('categoryBadge')}>{item.category}</div>
                            <h1 className={cx('title')}>{item.title}</h1>
                            <div className={cx('meta')}>
                                <span className={cx('author')}>Bởi {item.createdByName || 'NovaBeauty'}</span>
                                <span className={cx('dot')}>•</span>
                                <span className={cx('date')}>
                                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : ''}
                                </span>
                            </div>
                        </header>

                        {item.imageUrl && (
                            <div className={cx('mainImage')}>
                                <img src={item.imageUrl} alt={item.title} />
                            </div>
                        )}

                        <div className={cx('content')} dangerouslySetInnerHTML={{ __html: item.description }} />

                        <footer className={cx('footer')}>
                            <Link to="/magazines" className={cx('backBtn')}>
                                <FontAwesomeIcon icon={faArrowLeft} />
                                Xem tất cả bài viết
                            </Link>
                        </footer>
                    </article>

                    <aside className={cx('sidebar')}>
                        <div className={cx('sidebarSection')}>
                            <h3 className={cx('sidebarTitle')}>Bài viết liên quan</h3>
                            <div className={cx('relatedList')}>
                                {relatedItems.map((rel) => (
                                    <Link key={rel.id} to={`/magazine/${rel.id}`} className={cx('relatedCard')}>
                                        <div className={cx('relImage')}>
                                            <img src={rel.imageUrl} alt={rel.title} />
                                        </div>
                                        <div className={cx('relInfo')}>
                                            <span className={cx('relCategory')}>{rel.category}</span>
                                            <h4 className={cx('relTitle')}>{rel.title}</h4>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div className={cx('sidebarSection', 'sticky')}>
                            <div className={cx('promoBanner')}>
                                <h4>Khám phá ưu đãi</h4>
                                <p>Săn deal hot ngay tại NovaBeauty để nhận ưu đãi lên đến 50%!</p>
                                <Link to="/" className={cx('promoBtn')}>
                                    Mua sắm ngay
                                </Link>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default MagazineDetail;
