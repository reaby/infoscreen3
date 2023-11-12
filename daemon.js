#!/usr/bin/env node

import fs from 'fs';
import { daemon } from 'daemon';
var stdoutFd = fs.openSync('./data/output.log', 'a');
var stderrFd = fs.openSync('./data/errors.log', 'a');
var proc2 = daemon("./infoscreen3",
    "",
    {
        cwd: process.cwd(),
        stdout: stdoutFd,
        stderr: stderrFd,
    });

console.log(proc2.pid);
