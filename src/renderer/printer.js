const shell = require('node-powershell')
const childProcess = require('child_process')
const iconv = require('iconv-lite')
import path from 'path'

let ps = new shell({
  executionPolicy: 'Bypass',
  noProfile: true
})

import { rootPath } from 'electron-root-path'

function pausePrinter (printerName) {
  let cmd
  if (!printerName) {
    cmd = `gwmi win32_printer | % { $null = $_.pause() }`
  } else {
    cmd = `gwmi win32_printer | ? { $_.Name -eq '${printerName}' } | % { $null = $_.pause() }`
  }
  ps.addCommand(cmd)
  return ps.invoke()
}

function resumePrinter (printerName) {
  let cmd
  if (!printerName) {
    cmd = `gwmi win32_printer | % { $null = $_.resume() }`
  } else {
    cmd = `gwmi win32_printer | ? { $_.Name -eq '${printerName}' } | % { $null = $_.resume() }`
  }
  ps.addCommand(cmd)
  return ps.invoke()
}

function removeAllPrintJobs () {
  ps.addCommand(`gwmi win32_printjob | % {$null = $_.delete()}`)
  return ps.invoke()
}

function removePrintJob (jobId) {
  ps.addCommand(`gwmi win32_printjob | ? { $_.JobId -eq ‘${jobId}’ } | % {$null = $_.delete()}`)
  return ps.invoke()
}

/*
async function getPrintJobs () {
  ps.addCommand(`gwmi win32_printjob | select -Property JobId, Document, JobStatus, TotalPages, StatusMask, Size, PaperSize, TimeSubmitted, PagesPrinted, ElapsedTime`)
  const output = await ps.invoke()
  const jobs = []
  output.split('\n').filter((line) => line.trim())
    .map((line) => line.match(/^(.*?)\s+?:\s+?(.*?)\s+?$/).slice(1))
    .forEach((value) => {
      let i = jobs.length - 1
      if (value[0] === 'JobId') {
        jobs.push({})
        ++i
      }
      jobs[i][value[0]] = value[1]
    }, [])
  return jobs
}
*/

async function getPrintJobs () {
  if (process.env.NODE_ENV !== 'production') {
    return [{
      document: 'document',
      pages: 5,
      copies: 4
    }, {
      document: 'document',
      pages: 5,
      copies: 4
    }]
  }
  
  const cmd = path.join(rootPath, 'resources', 'get-printjob.exe')
  const stdout = await new Promise((resolve, reject) => {
    childProcess.exec(cmd, { encoding: 'buffer' }, (error, stdout) => {
      if (error) return reject(error)
      resolve(stdout)
    })
  })

  const jobs = iconv.decode(stdout, 'cp936')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
    const cells = line.split('\t')
    return {
      document: cells[0],
      pages: Number.parseInt(cells[1]),
      copies: Number.parseInt(cells[2])
    }
  })
  return jobs
}

export default {
  pausePrinter,
  resumePrinter,
  getPrintJobs,
  removeAllPrintJobs,
  removePrintJob
}
