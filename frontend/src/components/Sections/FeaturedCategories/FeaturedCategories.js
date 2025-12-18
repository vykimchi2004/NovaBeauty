import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './FeaturedCategories.module.scss';
import { getActiveCategories } from '~/services/category';

const cx = classNames.bind(styles);

function FeaturedCategories() {
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        // Lấy tất cả danh mục active (bao gồm cả con và cháu)
        const data = await getActiveCategories();
        const activeCategories = (data || []).filter(cat => cat.status !== false);
        setAllCategories(activeCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setAllCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Build categories tree: root -> children -> grandchildren
  const categoriesTree = useMemo(() => {
    if (!allCategories || allCategories.length === 0) return [];
    
    const rootCats = allCategories.filter((cat) => !cat.parentId);
    return rootCats.map((root) => {
      const children = allCategories.filter((cat) => cat.parentId === root.id);
      // Thêm grandchildren cho mỗi child
      const childrenWithGrandchildren = children.map((child) => ({
        ...child,
        children: allCategories.filter((cat) => cat.parentId === child.id),
      }));
      return {
        ...root,
        children: childrenWithGrandchildren,
      };
    }).slice(0, 7); // Giới hạn 7 root categories
  }, [allCategories]);

  return (
    <section className={cx('container')} aria-labelledby="featured-categories-heading">
      <div className={cx('inner')}>
        <div className={cx('row')}>
          <div className={cx('intro')}>
            <h2 id="featured-categories-heading" className={cx('title')}>
              DANH MỤC HOT
            </h2>
            <Link to="/products" className={cx('cta')}>
              XEM NGAY
            </Link>
          </div>
          <div className={cx('categoriesContainer')}>
            {loading ? (
              <div className={cx('loading')}>Đang tải...</div>
            ) : categoriesTree.length === 0 ? (
              <div className={cx('empty')}>Chưa có danh mục nào</div>
            ) : (
              categoriesTree.map((rootCat) => (
                <div key={rootCat.id} className={cx('categoryGroup')}>
                  {/* Root category title */}
                  <Link to={`/products?category=${rootCat.id}`} className={cx('rootCategoryTitle')}>
                    {rootCat.name}
                  </Link>
                  
                  {/* Children categories - hiển thị ngang */}
                  {rootCat.children && rootCat.children.length > 0 && (
                    <div className={cx('childrenRow')}>
                      {rootCat.children.map((childCat) => (
                        <div key={childCat.id} className={cx('childCategoryGroup')}>
                          {/* Child category - in đậm */}
                          <Link 
                            to={`/products?category=${childCat.id}`} 
                            className={cx('childCategory')}
                          >
                            {childCat.name}
                          </Link>
                          
                          {/* Grandchildren - hiển thị dưới child category */}
                          {childCat.children && childCat.children.length > 0 && (
                            <div className={cx('grandchildrenList')}>
                              {childCat.children.map((grandChild) => (
                                <Link
                                  key={grandChild.id}
                                  to={`/products?category=${grandChild.id}`}
                                  className={cx('grandChild')}
                                >
                                  {grandChild.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeaturedCategories;
