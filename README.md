Server
=====

[![Test](https://github.com/quenktechnologies/server/actions/workflows/test.yml/badge.svg)](https://github.com/quenktechnologies/server/actions/workflows/test.yml)

# Introduction
This package is a collection of APIs and utils commonly used by Quenk 
Technologies when building Node.js based server applications.

The Quenk application server framework is [tendril][1] and most of the APIs
here are meant to be compatible with it. This package is therefore highly 
opinionated but also specialized to the way QT builds web applications.

# Installation

``sh 
npm install --save @quenk/server
``

# Usage

For now documentation exists in comments only. Familiarity with the tendril and
[potoo][2] packages are crucial to understand what's going on here.

## What Can This Be Used For?

At QT we focus mainly on custom information management systems from simple
databases to laboratory information systems and credit management applications.

Usually implemented as a single-page web application with many JSON endpoints.
If this sounds like what you need then check out [tendril][1] first to get a
feel of how we do things.

If you need help or have questions send an email to info AT quenk.com or reach
out to @metasansana on twitter.

# License

Apache-2.0 (C) 2022 Quenk Technologies Limited

[1]: https://github.com/quenktechnologies/tendril
[2]: https://github.com/quenktechnologies/potoo
