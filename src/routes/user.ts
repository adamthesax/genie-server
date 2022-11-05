// -*- mode: typescript; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Genie
//
// Copyright 2016-2019 The Board of Trustees of the Leland Stanford Junior University
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>

import Q from 'q';
import express from 'express';
import passport from 'passport';

import * as user from '../util/user';
import platform from '../service/platform';
import * as Config from '../config';
import { makeRandom } from '../util/random';

const router = express.Router();

router.get('/configure', (req, res, next) => {
    if (user.isConfigured()) {
        res.status(400).render('error', {
            message: "User already configured",
            page_title: "Genie - Error"
        });
        return;
    }
    res.render('configure', {
        csrfToken: req.csrfToken(),
        page_title: "Genie - Setup",
        errors: []
    });
});

router.post('/configure', (req, res, next) => {
    if (user.isConfigured()) {
        res.status(400).render('error', {
            message: "User already configured",
            page_title: "Genie - Error"
        });
        return;
    }

    let password : string;
    try {
        if (typeof req.body['password'] !== 'string' ||
            req.body['password'].length < 8 ||
            req.body['password'].length > 255)
            throw new Error("You must specifiy a valid password (of at least 8 characters)");

        if (req.body['confirm-password'] !== req.body['password'])
            throw new Error("The password and the confirmation do not match");
        password = req.body['password'];
    } catch(e) {
        res.render('configure', {
            csrfToken: req.csrfToken(),
            page_title: "Genie - Setup",
            errors: [e.message]
        });
        return;
    }

    user.register(password).then((userObj) => {
        user.unlock(req, password);
        return Q.ninvoke(req, 'login', userObj);
    }).then(() => {
        // Redirection back to the original page
        const redirect_to = req.session.redirect_to || '/';
        delete req.session.redirect_to;
        res.redirect(redirect_to);
    }).catch((error) => {
        res.render('configure', {
            csrfToken: req.csrfToken(),
            page_title: "Genie - Setup",
            errors: [error.message]
        });
    });
});

router.get('/login', (req, res, next) => {
    res.render('login', {
        csrfToken: req.csrfToken(),
        errors: req.flash('error'),
        page_title: "Genie - Login"
    });
});

router.post('/login', passport.authenticate('local', { failureRedirect: Config.BASE_URL + '/user/login',
                                                       failureFlash: true }), (req, res, next) => {
    user.unlock(req, req.body.password);
    // Redirection back to the original page
    const redirect_to = req.session.redirect_to || (Config.BASE_URL + '/');
    delete req.session.redirect_to;
    res.redirect(303, redirect_to);
});

router.get('/logout', (req, res, next) => {
    req.logout((error) => {
        return undefined;
    });
    res.redirect(Config.BASE_URL + '/');
});


router.post('/token', user.requireLogIn, (req, res, next) => {
    const prefs = platform.getSharedPreferences();
    let accessToken = prefs.get('access-token');
    if (!accessToken) {
        accessToken = makeRandom(32);
        prefs.set('access-token', accessToken);
    }
    res.json({ result: 'ok', token: accessToken });
});

export default router;
