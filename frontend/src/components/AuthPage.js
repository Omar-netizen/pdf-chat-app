// src/components/AuthPage.js
import React, { useState } from 'react';
import Login from './Login';
import Signup from './SignUp';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  const switchToLogin = () => setIsLogin(true);
  const switchToRegister = () => setIsLogin(false);

  return (
    <>
      {isLogin ? (
        <Login switchToRegister={switchToRegister} />
      ) : (
        <Signup switchToLogin={switchToLogin} />
      )}
    </>
  );
};

export default AuthPage;