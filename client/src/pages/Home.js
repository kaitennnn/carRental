import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Home = () => {
  const [featuredCars, setFeaturedCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedCars();
  }, []);

  const fetchFeaturedCars = async () => {
    try {
      const response = await axios.get('/api/cars?limit=6');
      setFeaturedCars(response.data.cars || []);
    } catch (error) {
      console.error('Error fetching featured cars:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-8 mx-auto text-center">
              <h1 className="display-4 fw-bold mb-4">
                寻找完美的租车体验
              </h1>
              <p className="lead mb-4">
                从经济型到豪华车型，我们为您提供最优质的汽车租赁服务
              </p>
              <Link to="/cars" className="btn btn-primary btn-lg">
                立即租车
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-5">
        <div className="container">
          <div className="row">
            <div className="col-lg-4 mb-4">
              <div className="text-center">
                <div className="mb-3">
                  <i className="fas fa-car fa-3x text-primary"></i>
                </div>
                <h4>多样化车型</h4>
                <p className="text-muted">
                  从经济实用到豪华舒适，满足您的各种出行需求
                </p>
              </div>
            </div>
            <div className="col-lg-4 mb-4">
              <div className="text-center">
                <div className="mb-3">
                  <i className="fas fa-shield-alt fa-3x text-primary"></i>
                </div>
                <h4>安全保障</h4>
                <p className="text-muted">
                  所有车辆都经过严格检查，为您提供安全可靠的驾驶体验
                </p>
              </div>
            </div>
            <div className="col-lg-4 mb-4">
              <div className="text-center">
                <div className="mb-3">
                  <i className="fas fa-clock fa-3x text-primary"></i>
                </div>
                <h4>24/7服务</h4>
                <p className="text-muted">
                  全天候客户服务，随时为您解决问题
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Cars Section */}
      <section className="py-5 bg-light">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fw-bold">热门车型</h2>
            <p className="text-muted">精选优质车型，为您的出行保驾护航</p>
          </div>
          
          {loading ? (
            <div className="text-center">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="row">
              {featuredCars.map((car) => (
                <div key={car._id} className="col-lg-4 col-md-6 mb-4">
                  <div className="card car-card h-100">
                    <img
                      src={car.images?.[0] || '/api/placeholder/300/200'}
                      className="card-img-top car-image"
                      alt={car.make + ' ' + car.model}
                    />
                    <div className="card-body d-flex flex-column">
                      <h5 className="card-title">{car.make} {car.model}</h5>
                      <p className="text-muted mb-2">{car.year}年 • {car.transmission}</p>
                      <div className="mb-3">
                        <span className="badge bg-primary me-2">{car.fuel_type}</span>
                        <span className="badge bg-secondary">{car.seats}座</span>
                      </div>
                      <div className="mt-auto">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <span className="h4 text-primary fw-bold">
                              ¥{car.price_per_day}
                            </span>
                            <small className="text-muted">/天</small>
                          </div>
                          <Link
                            to={`/booking/${car._id}`}
                            className="btn btn-primary"
                          >
                            立即预订
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="text-center mt-4">
            <Link to="/cars" className="btn btn-outline-primary btn-lg">
              查看更多车型
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;